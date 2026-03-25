var AnnotationImportService = class {

    static importAnnotations(params, controller) {
        const { parentKey, attachmentKey, uid, key } = params;
        const self = controller;
        const app = Application.sharedInstance();
        const tr = (typeof t === 'function') ? t : function (k) { return k; };
        
        app.showHUD(tr('fetching_annotations') || 'Fetching annotations...', self.view, 2);
        
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
        const tr = (typeof t === 'function') ? t : function (k) { return k; };
        
        // 1. Find the parent literature note by itemKey
        const targetWindow = self.addonWindow || self.window;
        const studyController = app.studyController(targetWindow);
        if (!studyController) return;
        
        const notebookId = studyController.notebookController.topicId || self.currentNotebookId;
        const notebook = db.getNotebookById(notebookId);
        if (!notebook) return;
        const doc = (notebook.documents && notebook.documents.length > 0) ? notebook.documents[0] : (notebook.mainDocMd5 ? db.getDocumentById(notebook.mainDocMd5) : undefined);
        if (!doc) {
            app.showHUD(tr('please_open_a_document_first'), self.view, 2);
            return;
        }
        
        const allNotes = notebook.notes;
        const notesArr = MNTreeExportService.toArray(allNotes);
        const parentItemKey = parentKey ? String(parentKey).trim() : '';
        const zoteroItemRe = /zotero:\/\/select\/library\/items(?:\/|\?itemKey=)([^"'\s&\/>]+)/;
        
        let targetNote = AnnotationImportService._getFirstSelectedNote(studyController);
        if (!targetNote) {
            for (let note of notesArr) {
                const itemKey = extractItemKeyFromNote(note, zoteroItemRe);
                if (itemKey && itemKey === parentItemKey) {
                    targetNote = note;
                    break;
                }
            }
        }

        if (!targetNote) {
            app.showHUD(tr('target_literature_note_not_found'), self.view, 2);
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
                annosRootNote = Note.createWithTitleNotebookDocument(annosTitle, notebook, doc);
                if (annosRootNote) {
                    targetNote.addChild(annosRootNote);
                }
            }

            if (!annosRootNote) return;

            // 3. Create notes for each annotation
            annos.forEach(anno => {
                const d = anno.data;
                const type = d.annotationType || 'highlight';
                const page = AnnotationImportService._resolveDisplayPageFromPosition(d.annotationPosition);
                const title = `[${type.toUpperCase()}]` + (page ? ` Page ${page}` : '');
                const annotationText = d.annotationText ? String(d.annotationText).trim() : '';
                const annotationComment = d.annotationComment ? String(d.annotationComment).trim() : '';
                const isInk = type === 'ink';

                if (!isInk && !annotationText && !annotationComment) {
                    return;
                }
                
                const annoNote = Note.createWithTitleNotebookDocument(title, notebook, doc);
                if (annoNote) {
                    annosRootNote.addChild(annoNote);
                    if (isInk) {
                        const svgHtml = AnnotationImportService._buildInkSvgFromPosition(d.annotationPosition, d.annotationColor);
                        if (svgHtml) {
                            annoNote.appendMarkdownComment(svgHtml);
                        }
                    }
                    if (annotationText) {
                        annoNote.appendMarkdownComment(AnnotationImportService._toMarkdownQuote(annotationText));
                    }
                    if (annotationComment) {
                        annoNote.appendTextComment(annotationComment);
                    }
                }
            });
        });

        app.refreshAfterDBChanged(notebook.topicId);

        const focusNoteId = (annosRootNote && annosRootNote.noteId) ? String(annosRootNote.noteId) : ((targetNote && targetNote.noteId) ? String(targetNote.noteId) : '');
        const targetTitle = targetNote && targetNote.noteTitle ? String(targetNote.noteTitle) : '';
        const importedMsg = tr('imported_annotations', { count: annos.length });
        const locationMsg = targetTitle ? (' → ' + targetTitle + '/Zotero Annotations') : '';
        app.showHUD(importedMsg + locationMsg, self.view, 2.2);

        if (focusNoteId && studyController && studyController.focusNoteInMindMapById) {
            NSTimer.scheduledTimerWithTimeInterval(0.2, false, function () {
                try {
                    studyController.focusNoteInMindMapById(focusNoteId);
                } catch (e) { }
            });
        }
    }

    static _buildInkSvgFromPosition(annotationPosition, annotationColor) {
        const parsed = AnnotationImportService._parseAnnotationPosition(annotationPosition);
        if (!parsed || !parsed.paths || !parsed.paths.length) return '';

        const bounds = AnnotationImportService._computePathBounds(parsed.paths);
        if (!bounds) return '';

        const strokeWidth = Math.max(1, Number(parsed.width) || 2);
        const padding = Math.max(2, strokeWidth * 1.5);
        const minX = bounds.minX - padding;
        const minY = bounds.minY - padding;
        const vbWidth = Math.max(1, (bounds.maxX - bounds.minX) + padding * 2);
        const vbHeight = Math.max(1, (bounds.maxY - bounds.minY) + padding * 2);
        const stroke = AnnotationImportService._sanitizeColor(annotationColor);

        const pathTags = parsed.paths.map(points => {
            const d = AnnotationImportService._toSvgPathD(points);
            if (!d) return '';
            return `<path d="${d}" />`;
        }).filter(Boolean).join('');

        if (!pathTags) return '';

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${vbWidth} ${vbHeight}" width="100%" height="auto"><g fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${pathTags}</g></svg>`;
    }

    static _parseAnnotationPosition(annotationPosition) {
        if (!annotationPosition) return null;
        if (typeof annotationPosition === 'object') return annotationPosition;
        try {
            return JSON.parse(String(annotationPosition));
        } catch (e) {
            return null;
        }
    }

    static _computePathBounds(paths) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        let hasPoint = false;

        paths.forEach(path => {
            if (!Array.isArray(path)) return;
            for (let i = 0; i + 1 < path.length; i += 2) {
                const x = Number(path[i]);
                const y = Number(path[i + 1]);
                if (!isFinite(x) || !isFinite(y)) continue;
                hasPoint = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        });

        if (!hasPoint) return null;
        return { minX, minY, maxX, maxY };
    }

    static _toSvgPathD(points) {
        if (!Array.isArray(points) || points.length < 4) return '';
        const commands = [];
        for (let i = 0; i + 1 < points.length; i += 2) {
            const x = Number(points[i]);
            const y = Number(points[i + 1]);
            if (!isFinite(x) || !isFinite(y)) continue;
            commands.push((commands.length === 0 ? 'M' : 'L') + x + ' ' + y);
        }
        return commands.length >= 2 ? commands.join(' ') : '';
    }

    static _sanitizeColor(color) {
        const raw = color ? String(color).trim() : '';
        if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) return raw;
        return '#2ea8e5';
    }

    static _toMarkdownQuote(text) {
        return String(text).split('\n').map(line => '> ' + line).join('\n');
    }

    static _resolveDisplayPageFromPosition(annotationPosition) {
        const parsed = AnnotationImportService._parseAnnotationPosition(annotationPosition);
        if (!parsed) return '';
        const pageIndex = Number(parsed.pageIndex);
        if (!isFinite(pageIndex)) return '';
        return String(Math.floor(pageIndex) + 1);
    }

    static _getFirstSelectedNote(studyController) {
        if (!studyController || !studyController.notebookController) return null;
        const nc = studyController.notebookController;
        const mindmapView = nc.mindmapView || nc.mindMapView || nc.noteMindMap;
        if (!mindmapView) return null;
        const selViewLst = mindmapView.selViewLst;
        if (!selViewLst) return null;
        const count = selViewLst.length !== undefined
            ? selViewLst.length
            : (typeof selViewLst.count === 'function' ? selViewLst.count() : (selViewLst.count !== undefined ? selViewLst.count : 0));
        if (!count) return null;

        const first = selViewLst.objectAtIndex ? selViewLst.objectAtIndex(0) : selViewLst[0];
        if (!first) return null;
        const node = first.note !== undefined ? first.note : first;
        const note = node && node.note !== undefined ? node.note : node;
        if (!note || !note.noteId) return null;
        return note;
    }
};
