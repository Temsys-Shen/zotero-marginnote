var AnnotationImportService = class {

    static importAnnotations(params, controller) {
        const { parentKey, attachmentKey, uid, key } = params;
        const self = controller;
        const app = Application.sharedInstance();
        
        app.showHUD(T('fetching_annotations') || 'Fetching annotations...', self.view, 2);
        
        const baseUrl = SZZoteroBridge._resolveCloudApiBaseUrl();
        const url = `${baseUrl}/users/${encodeURIComponent(uid)}/items/${encodeURIComponent(attachmentKey)}/children?itemType=annotation&limit=100`;
        const headers = { 
            'Zotero-API-Version': '3',
            'Zotero-API-Key': key 
        };

        SZMNNetwork.fetch(url, { method: 'GET', headers: headers }).then(res => {
            if (res.status !== 200) {
                app.showHUD('Fetch failed: ' + res.status, self.view, 2);
                return;
            }
            const annosRaw = res.json();
            const annos = MNTreeExportService.toArray(annosRaw);
            if (annos.length === 0) {
                app.showHUD('No annotations found.', self.view, 2);
                return;
            }

            AnnotationImportService._processImport(annos, parentKey, attachmentKey, self);
        }).catch(err => {
            app.showHUD('Error: ' + err.message, self.view, 2);
        });
    }

    static _processImport(annos, parentKey, attachmentKey, controller) {
        const self = controller;
        const db = Database.sharedInstance();
        const app = Application.sharedInstance();
        
        // 1. Find the parent literature note by itemKey
        const targetWindow = self.addonWindow || self.window;
        const studyController = app.studyController(targetWindow);
        if (!studyController) return;
        
        const notebookId = studyController.notebookController.topicId || self.currentNotebookId;
        const notebook = db.getNotebookById(notebookId);
        if (!notebook) return;
        
        const allNotes = notebook.notes;
        const notesArr = MNTreeExportService.toArray(allNotes);
        const parentNoteRe = new RegExp('zotero://select/library/items/' + parentKey);
        
        let targetNote = null;
        for (let note of notesArr) {
            if (extractItemKeyFromNote(note, parentNoteRe)) {
                targetNote = note;
                break;
            }
        }

        if (!targetNote) {
            app.showHUD(T('target_literature_note_not_found'), self.view, 2);
            return;
        }

        // 2. Create or find "Annotations" sub-note
        let annosRootNote = null;
        const children = MNTreeExportService.toArray(targetNote.childNotes);
        const annosTitle = 'Zotero Annotations';
        for (let child of children) {
            if (child.noteTitle === annosTitle) {
                annosRootNote = child;
                break;
            }
        }

        UndoManager.sharedInstance().undoGrouping("Import Annotations", notebook.topicId, () => {
            if (!annosRootNote) {
                annosRootNote = Note.createWithTitleNotebookDocument(annosTitle, notebook, null);
                if (annosRootNote) {
                    annosRootNote.parentNote = targetNote;
                }
            }

            if (!annosRootNote) return;

            // 3. Create notes for each annotation
            annos.forEach(anno => {
                const d = anno.data;
                const type = d.annotationType || 'highlight';
                const page = d.annotationPageLabel || d.pageLabel || '';
                const title = `[${type.toUpperCase()}]` + (page ? ` Page ${page}` : '');
                const content = d.annotationText || '';
                const comment = d.annotationComment || '';
                
                const annoNote = Note.createWithTitleNotebookDocument(title, notebook, null);
                if (annoNote) {
                    annoNote.parentNote = annosRootNote;
                    if (content) {
                        annoNote.excerptText = content;
                    }
                    if (comment) {
                        annoNote.appendTextComment(comment);
                    }
                    // Add link back to Zotero annotation
                    const annoLink = 'zotero://open-pdf/library/items/' + attachmentKey + '?page=' + (d.annotationPageLabel || '');
                    annoNote.appendMarkdownComment(`[Open in Zotero](${annoLink})`);
                }
            });
        });

        app.refreshAfterDBChanged(notebook.topicId);
        app.showHUD(T('imported_annotations', { count: annos.length }), self.view, 2);
    }
};
