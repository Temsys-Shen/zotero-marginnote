function setupZoteroPanelDelegate(context) {
  context.zoteroPanelDelegate = {
    numberOfRowsInSection(section) {
      return context.filteredItems.length;
    },

    cellForRowAtIndexPath(indexPath) {
      const cell = context.tableView.dequeueReusableCellWithIdentifierForIndexPath('ZoteroItemCell', indexPath);
      const item = context.filteredItems[indexPath.row];

      if (!cell.viewWithTag(100)) {
        const cellWidth = context.tableView.bounds.width;

        const iconLabel = new UILabel();
        iconLabel.frame = {x: 15, y: 10, width: 30, height: 60};
        iconLabel.tag = 100;
        iconLabel.font = UIFont.systemFontOfSize(24);
        iconLabel.textAlignment = 1;
        cell.contentView.addSubview(iconLabel);

        const titleLabel = new UILabel();
        titleLabel.frame = {x: 55, y: 8, width: cellWidth - 70, height: 24};
        titleLabel.tag = 101;
        titleLabel.font = UIFont.boldSystemFontOfSize(16);
        titleLabel.textColor = UIColor.colorWithHexString('#333333');
        titleLabel.numberOfLines = 2;
        cell.contentView.addSubview(titleLabel);

        const metaLabel = new UILabel();
        metaLabel.frame = {x: 55, y: 36, width: cellWidth - 70, height: 18};
        metaLabel.tag = 102;
        metaLabel.font = UIFont.systemFontOfSize(12);
        metaLabel.textColor = UIColor.colorWithHexString('#666666');
        cell.contentView.addSubview(metaLabel);

        const tagsLabel = new UILabel();
        tagsLabel.frame = {x: 55, y: 56, width: cellWidth - 70, height: 16};
        tagsLabel.tag = 103;
        tagsLabel.font = UIFont.systemFontOfSize(11);
        tagsLabel.textColor = UIColor.colorWithHexString('#999999');
        cell.contentView.addSubview(tagsLabel);
      }

      configureCell(context, cell, item);

      return cell;
    },

    heightForRowAtIndexPath(indexPath) {
      return 80;
    },

    didSelectRowAtIndexPath(indexPath) {
      context.tableView.deselectRowAtIndexPathAnimated(indexPath, true);
    }
  };
}

function showZoteroPanel(context) {
  const addon = context;
  const win = addon.window;
  const bounds = win.bounds;

  const panelWidth = Math.min(600, bounds.width - 40);
  const panelHeight = Math.min(700, bounds.height - 100);

  const panel = new UIView({
    x: (bounds.width - panelWidth) / 2,
    y: (bounds.height - panelHeight) / 2,
    width: panelWidth,
    height: panelHeight
  });

  panel.backgroundColor = UIColor.whiteColor();
  panel.layer.cornerRadius = 12;
  panel.layer.borderWidth = 1;
  panel.layer.borderColor = UIColor.colorWithHexString('#E5E5E5');
  panel.layer.shadowColor = UIColor.blackColor();
  panel.layer.shadowOpacity = 0.2;
  panel.layer.shadowOffset = {width: 0, height: 2};
  panel.layer.shadowRadius = 8;

  const headerHeight = 50;
  const header = new UIView({x: 0, y: 0, width: panelWidth, height: headerHeight});
  header.backgroundColor = UIColor.colorWithHexString('#F2F2F5');
  header.layer.cornerRadius = 12;
  header.layer.masksToBounds = true;

  // @ts-ignore
  const titleLabel = new UILabel({x: 15, y: 12, width: panelWidth - 100, height: 26});
  titleLabel.text = 'Zotero文献';
  titleLabel.font = UIFont.boldSystemFontOfSize(18);
  titleLabel.textColor = UIColor.colorWithHexString('#333333');
  header.addSubview(titleLabel);

  const closeButton = UIButton.buttonWithType(0);
  closeButton.frame = {x: panelWidth - 45, y: 10, width: 35, height: 30};
  closeButton.setTitleForState('✕', 0);
  closeButton.setTitleColorForState(UIColor.colorWithHexString('#666666'), 0);
  closeButton.titleLabel.font = UIFont.systemFontOfSize(20);
  closeButton.addTargetActionForControlEvents(context, 'closeZoteroPanel:', 1 << 6);
  header.addSubview(closeButton);

  const refreshButton = UIButton.buttonWithType(0);
  refreshButton.frame = {x: panelWidth - 85, y: 10, width: 35, height: 30};
  refreshButton.setTitleForState('🔄', 0);
  refreshButton.setTitleColorForState(UIColor.colorWithHexString('#666666'), 0);
  refreshButton.titleLabel.font = UIFont.systemFontOfSize(16);
  refreshButton.addTargetActionForControlEvents(context, 'refreshZoteroItems:', 1 << 6);
  header.addSubview(refreshButton);

  panel.addSubview(header);

  const searchField = new UITextField({x: 15, y: headerHeight + 10, width: panelWidth - 30, height: 36});
  searchField.placeholder = '搜索标题...';
  searchField.borderStyle = 3;
  searchField.delegate = context;
  addon.searchField = searchField;
  panel.addSubview(searchField);

  const tableView = new UITableView({
    x: 0,
    y: headerHeight + 56,
    width: panelWidth,
    height: panelHeight - headerHeight - 56
  });

  setupZoteroPanelDelegate(context);
  tableView.dataSource = context.zoteroPanelDelegate;
  tableView.delegate = context.zoteroPanelDelegate;
  tableView.registerClassForCellReuseIdentifier(UITableViewCell, 'ZoteroItemCell');
  tableView.separatorStyle = 1;
  tableView.backgroundColor = UIColor.whiteColor();
  addon.tableView = tableView;
  panel.addSubview(tableView);

  win.addSubview(panel);
  addon.panelView = panel;
  addon.filteredItems = [];
}

function closeZoteroPanel(context, sender) {
  if (context.panelView) {
    context.panelView.removeFromSuperview();
    context.panelView = null;
    context.tableView = null;
    context.searchField = null;
  }
}

async function loadZoteroItems(context) {
  const app = Application.sharedInstance();
  const win = context.window;

  if (context.lastFetchTime && Date.now() - context.lastFetchTime < 10 * 1000) {
    updateFilteredItems(context);
    return;
  }

  app.waitHUDOnView('正在加载...', win);

  try {
    const client = new ZoteroClient({
      userId: '0',
      apiKey: '1',
      local: true
    });

    const items = await client.getItems({ limit: 100 });

    app.stopWaitHUDOnView(win);

    if (!items || items.length === 0) {
      app.alert('未找到文献');
      return;
    }

    context.zoteroItems = items;
    context.lastFetchTime = Date.now();
    updateFilteredItems(context);

  } catch (error) {
    app.stopWaitHUDOnView(win);
    app.alert(`加载失败:\n${error}`);
    JSB.log('Zotero Error: %@', String(error));
  }
}

function updateFilteredItems(context) {
  const searchText = context.searchField ? context.searchField.text : '';
  
  if (!searchText || searchText.length === 0) {
    context.filteredItems = context.zoteroItems;
  } else {
    const query = searchText.toLowerCase();
    context.filteredItems = context.zoteroItems.filter(item => {
      const title = item.data && item.data.title ? item.data.title.toLowerCase() : '';
      return title.includes(query);
    });
  }

  if (context.tableView) {
    context.tableView.reloadData();
  }
}

async function refreshZoteroItems(context, sender) {
  context.lastFetchTime = 0;
  await loadZoteroItems(context);
}

function configureCell(context, cell, item) {
  cell.backgroundColor = UIColor.whiteColor();
  cell.selectionStyle = 0;

  const hasAttachment = item.links && item.links.attachment;
  const iconLabel = cell.viewWithTag(100);
  if (iconLabel) {
    iconLabel.text = hasAttachment ? '📄' : '📝';
  }

  const titleLabel = cell.viewWithTag(101);
  if (titleLabel) {
    titleLabel.text = item.data && item.data.title ? item.data.title : '无标题';
  }

  const metaLabel = cell.viewWithTag(102);
  if (metaLabel) {
    const author = item.meta && item.meta.creatorSummary ? item.meta.creatorSummary : '未知作者';
    const year = item.meta && item.meta.parsedDate ? item.meta.parsedDate : '未知年份';
    const attachmentInfo = hasAttachment ? ' | 1个附件' : ' | 无附件';
    metaLabel.text = `${author} | ${year}${attachmentInfo}`;
  }

  const tagsLabel = cell.viewWithTag(103);
  if (tagsLabel) {
    const tags = item.data && item.data.tags ? item.data.tags : [];
    const tagText = tags.slice(0, 3).map(t => `#${t.tag}`).join(' ');
    tagsLabel.text = tags.length > 3 ? `${tagText} +${tags.length - 3}` : tagText;
  }
}

function textFieldShouldReturn(context, textField) {
  textField.resignFirstResponder();
  return false;
}

function textFieldDidChange(context, textField) {
  updateFilteredItems(context);
}
