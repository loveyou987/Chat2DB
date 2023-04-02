import React, { memo, useEffect, useState, useContext } from 'react';
import styles from './index.less';
import classnames from 'classnames';
import ModifyTable from '@/components/ModifyTable/ModifyTable';
import DatabaseQuery from '@/components/DatabaseQuery';
import AppHeader from '@/components/AppHeader';
import { qs } from '@/utils'

import historyService from '@/service/history';

import { Tabs, Modal, Button, Input } from 'antd';
import {
  ISavedConsole,
  IConsole,
  IEditTableConsole,
  ISQLQueryConsole,
} from '@/types';
import { TabOpened, ConsoleType, ConsoleStatus, DatabaseTypeCode } from '@/utils/constants';

import { DatabaseContext } from '@/context/database'
import { MenuItem } from '../Menu';

interface Iprops {
  className?: string;
}

export default memo<Iprops>(function ConsoleList(props) {
  const { consoleId } = qs<{ consoleId: string }>()
  const { model, setcreateConsoleDialog, setDblclickNodeData } = useContext(DatabaseContext);
  const [windowList, setWindowList] = useState<IConsole[]>([]);
  const [activeKey, setActiveKey] = useState<string>(consoleId);
  const { dblclickNodeData } = model;

  useEffect(() => {
    if (dblclickNodeData) {
      let flag = false
      windowList.map(i => {
        if (i.databaseName === dblclickNodeData.databaseName && i.dataSourceId === dblclickNodeData.dataSourceId) {
          flag = true
        }
      })
      if (!flag) {
        let p = {
          name: `${dblclickNodeData?.databaseName}-console`,
          type: dblclickNodeData.dataType as DatabaseTypeCode,
          dataSourceId: dblclickNodeData.dataSourceId!,
          databaseName: dblclickNodeData?.databaseName!,
          status: ConsoleStatus.DRAFT,
          ddl: 'SELECT * FROM',
          tabOpened: TabOpened.IS_OPEN,
        };

        historyService.saveWindowTab(p).then((res) => {
          const newConsole: IConsole = {
            name: `${dblclickNodeData?.databaseName}-console`,
            key: res.toString(),
            type: ConsoleType.SQLQ,
            DBType: dblclickNodeData.dataType!,
            databaseName: dblclickNodeData.databaseName!,
            dataSourceId: dblclickNodeData.dataSourceId!,
            consoleId: res,
            ddl: 'SELECT * FROM',
          };
          setActiveKey(newConsole.key)
          setWindowList([...windowList, newConsole])
        });
      }
    }
  }, [dblclickNodeData])

  useEffect(() => {
    getConsoleList();
  }, []);

  function getConsoleList() {
    let p = {
      pageNo: 1,
      pageSize: 999,
      tabOpened: TabOpened.IS_OPEN,
    };

    historyService.getSaveList(p).then((res) => {
      let flag = false;
      const newWindowList = res.data?.map((item, index) => {
        if (!consoleId && index === 0) {
          setActiveKey(item.id + '');
        } else if (item.id === +consoleId) {
          flag = true
        }
        return {
          consoleId: item.id,
          ddl: item.ddl,
          name: item.name,
          key: item.id + '',
          DBType: item.type,
          type: ConsoleType.SQLQ,
          status: item.status,
          databaseName: item.databaseName,
          dataSourceName: item?.dataSourceName,
          dataSourceId: item.dataSourceId
        };
      })
      if (!flag) {
        // newWindowList.push({})
      }
      setWindowList(newWindowList);
    });
  }

  function renderCurrentTab(i: IConsole) {
    if (i.type === 'editTable') {
      return <ModifyTable data={i as IEditTableConsole}></ModifyTable>;
    } else {
      return (
        <DatabaseQuery
          windowTab={i as ISQLQueryConsole}
          key={i.key}
          activeTabKey={activeKey!}
        />
      );
    }
  }

  const onChangeTab = (newActiveKey: string) => {
    setActiveKey(newActiveKey);
  };

  const onEdit = (targetKey: any, action: 'add' | 'remove', window: any) => {
    // if (action === 'add') {
    //   setcreateConsoleDialog(true)
    // } else {
    //   closeWindowTab(targetKey);
    // }
    if (action === 'remove') {
      closeWindowTab(targetKey, window);
    }
  };

  const closeWindowTab = (targetKey: string, window: any) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    windowList.forEach((item, i) => {
      if (item.key === targetKey) {
        lastIndex = i - 1;
      }
    });
    const newPanes = windowList.filter((item) => item.key !== targetKey);
    if (newPanes.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newPanes[lastIndex].key;
      } else {
        newActiveKey = newPanes[0].key;
      }
    }
    setWindowList(newPanes);
    setActiveKey(newActiveKey);
    let p: any = {
      id: targetKey,
      tabOpened: 'n',
    };

    if (window.status === 'DRAFT') {
      historyService.deleteWindowTab({ id: window.id })
    } else {
      historyService.updateWindowTab(p);
    }
  };

  function createdCallback(newConsole: IConsole) {
    setWindowList([...windowList, newConsole]);
    setActiveKey(newConsole.key);
  }

  return <div className={styles.box}>
    <AppHeader className={styles.appHeader} showRight={false}>
      <div className={styles.tabsBox}>
        {
          !!windowList.length &&
          <Tabs
            hideAdd
            type="editable-card"
            onChange={onChangeTab}
            activeKey={activeKey}
            onEdit={(targetKey: any, action: 'add' | 'remove') => { onEdit(targetKey, action, window) }}
            items={windowList.map(t => {
              return {
                key: t.key,
                label: t.name
              }
            })}
          ></Tabs>
        }
      </div>
    </AppHeader>
    <div className={styles.databaseQueryBox}>
      {windowList?.map((i: IConsole, index: number) => {
        return (
          <div
            key={index}
            className={classnames(styles.windowContent, {
              [styles.concealTab]: activeKey !== i.key,
            })}
          >
            {renderCurrentTab(i)}
          </div>
        );
      })}
    </div>
    <CreateConsoleModal createdCallback={createdCallback} />
  </div>

});

export function CreateConsoleModal({ createdCallback }: { createdCallback: (newConsole: IConsole) => void }) {
  const { model, setcreateConsoleDialog } = useContext(DatabaseContext);
  const { createConsoleDialog } = model
  const [consoleName, setConsoleName] = useState<string>();

  function handleOk() {
    createConsole();
  }

  function handleCancel() {
    setcreateConsoleDialog(false)
  }

  function createConsole() {
    if (!consoleName) {
      return
    }

    if (!createConsoleDialog) {
      return
    }

    let p = {
      name: consoleName,
      type: DatabaseTypeCode.MYSQL,
      dataSourceId: createConsoleDialog.dataSourceId,
      databaseName: createConsoleDialog?.databaseName,
      status: ConsoleStatus.DRAFT,
      ddl: 'SELECT * FROM',
      tabOpened: TabOpened.IS_OPEN,
    };

    historyService.saveWindowTab(p).then((res) => {
      const newConsole: IConsole = {
        name: `${createConsoleDialog.databaseName}-console`,
        key: res.toString(),
        type: ConsoleType.SQLQ,
        DBType: DatabaseTypeCode.MYSQL,
        databaseName: createConsoleDialog.databaseName,
        dataSourceId: createConsoleDialog.dataSourceId,
        consoleId: res,
        ddl: 'SELECT * FROM',
      };
      createdCallback(newConsole);
      setcreateConsoleDialog(false);
      setConsoleName('');
    });
  }

  return <Modal
    title="新建查询控制台"
    open={!!createConsoleDialog}
    onOk={handleOk}
    onCancel={handleCancel}
    width={400}
    style={{ top: '20%' }}
    footer={
      <>
        <Button onClick={handleCancel} className={styles.cancel}>
          取消
        </Button>
        <Button type="primary" onClick={handleOk} className={styles.cancel}>
          添加
        </Button>
      </>
    }
  >
    <Input value={consoleName} onChange={(e) => { setConsoleName(e.target.value) }} />
  </Modal>
}
