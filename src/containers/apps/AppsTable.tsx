import {
    CheckOutlined,
    CodeOutlined,
    DisconnectOutlined,
    LinkOutlined,
    LoadingOutlined,
} from '@ant-design/icons'
import { Button, Card, Input, Row, Table, Tag, Tooltip } from 'antd'
import { ColumnProps } from 'antd/lib/table'
import { History } from 'history'
import React, { Component, Fragment } from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { IMobileComponent } from '../../models/ContainerProps'
import Logger from '../../utils/Logger'
import NewTabLink from '../global/NewTabLink'
import Timestamp from '../global/Timestamp'
import { IAppDef } from './AppDefinition'

type TableData = IAppDef & { lastDeployTime: string }

class AppsTable extends Component<
    {
        history: History
        apps: IAppDef[]
        rootDomain: string
        defaultNginxConfig: string
        isMobile: boolean
        onAppScaled: (appName: string, instanceCount: number) => void
        search: string | undefined
    },
    { searchTerm: string }
> {
    constructor(props: any) {
        super(props)
        const urlsQuery = new URLSearchParams(props.search || '').get('q') || ''
        this.state = { searchTerm: urlsQuery }
    }

    appDetailPath(appName: string) {
        return `/apps/details/${appName}`
    }

    createColumns() {
        const self = this
        const ALIGN: 'center' = 'center'
        const columns: ColumnProps<TableData>[] = [
            {
                title: 'App Name',
                dataIndex: 'appName',
                key: 'appName',
                render: (appName: string) => (
                    <Link to={this.appDetailPath(appName)}>{appName}</Link>
                ),
                sorter: (a, b) => {
                    return a.appName
                        ? a.appName.localeCompare(b.appName || '')
                        : 0
                },
                sortDirections: ['descend', 'ascend'],
            },
            {
                title: 'Persistent Data	',
                dataIndex: 'hasPersistentData',
                key: 'hasPersistentData',
                align: ALIGN,
                render: (hasPersistentData: boolean) => {
                    if (!hasPersistentData) {
                        return <span />
                    }

                    return (
                        <span>
                            <CheckOutlined />
                        </span>
                    )
                },
            },
            {
                title: 'Instance Count',
                dataIndex: 'instanceCount',
                key: 'instanceCount',
                align: ALIGN,
                render: (instanceCount: number, row, index) => {
                    return (
                        <Button
                            style={{ margin: -5 }}
                            onClick={async () => {
                                const warning =
                                    'Do you want to turn this app ' +
                                    (instanceCount ? 'OFF' : 'ON') +
                                    '?'
                                if (!window.confirm(warning)) return
                                if (!row.appName) return alert('no row.appName')
                                this.props.onAppScaled(
                                    row.appName,
                                    instanceCount ? 0 : 1
                                )
                            }}
                        >
                            {instanceCount}
                        </Button>
                    )
                },
            },
            {
                title: 'Tags',
                dataIndex: 'tags',
                key: 'tags',
                align: ALIGN,
                width: '18%',
                render: (_: any, app: TableData) => {
                    return (
                        <Fragment>
                            {app.tags && app.tags.length > 0 ? (
                                app.tags.map((it) => (
                                    <Tag key={it.tagName} style={{ margin: 2 }}>
                                        <a
                                            href="/"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                self.setState({
                                                    searchTerm:
                                                        'tag:' + it.tagName,
                                                })
                                            }}
                                        >
                                            <span className="unselectable-span">
                                                {it.tagName}
                                            </span>
                                        </a>
                                    </Tag>
                                ))
                            ) : (
                                <span></span>
                            )}
                        </Fragment>
                    )
                },
            },
            {
                title: 'Last Deployed',
                dataIndex: 'lastDeployTime',
                key: 'lastDeployTime',
                align: ALIGN,
                sorter: (a, b) => {
                    return (
                        Date.parse(a.lastDeployTime) -
                        Date.parse(b.lastDeployTime)
                    )
                },
                sortDirections: ['descend', 'ascend'],
                render: (lastDeployTime: string, app) => {
                    if (!lastDeployTime) {
                        return <span />
                    }

                    return (
                        <span>
                            <Timestamp timestamp={lastDeployTime} />
                            {!!app.isAppBuilding ? (
                                <LoadingOutlined
                                    style={{
                                        fontSize: '12px',
                                        marginLeft: 12,
                                    }}
                                />
                            ) : undefined}
                        </span>
                    )
                },
            },
            {
                title: 'Open',
                dataIndex: 'notExposeAsWebApp',
                key: 'openInBrowser',
                align: ALIGN,
                render: (notExposeAsWebApp: boolean, app) => {
                    if (notExposeAsWebApp) {
                        return (
                            <Tooltip title="Not exposed as a web app">
                                <DisconnectOutlined />
                            </Tooltip>
                        )
                    }

                    return (
                        <NewTabLink
                            url={`http${
                                app.hasDefaultSubDomainSsl ? 's' : ''
                            }://${app.appName}.${self.props.rootDomain}`}
                        >
                            <LinkOutlined />{' '}
                        </NewTabLink>
                    )
                },
            },
        ]

        // Set default sort order
        const sortKey = window.localStorage.appsSortKey || 'appName'
        const sortOrder = window.localStorage.appsSortOrder || 'ascend'
        const sorted =
            columns.find((column) => column.key === sortKey) || columns[0]
        sorted.defaultSortOrder = sortOrder

        return columns
    }

    render() {
        const self = this

        const appsToRender = self.props.apps
            .filter((app) => {
                const searchTerm = self.state.searchTerm
                if (!searchTerm) return true

                if (searchTerm.startsWith('tag:')) {
                    const entries = searchTerm.substring(4).split(' ')
                    const tagToFilter = entries[0]
                    const tagExists =
                        (app.tags || []).filter((t) =>
                            t.tagName.startsWith(tagToFilter)
                        ).length > 0
                    if (entries.length > 1) {
                        const appNameToFilter = searchTerm
                            .substring(4)
                            .split(' ')[1]
                        return (
                            tagExists &&
                            app.appName!.indexOf(appNameToFilter) >= 0
                        )
                    }
                    return tagExists
                }

                return app.appName!.indexOf(searchTerm) >= 0
            })
            .map((app) => {
                let versionFound = app.versions.filter(
                    (v) => v.version === app.deployedVersion
                )

                let lastDeployTime = ''

                if (versionFound.length === 0) {
                    // See https://github.com/caprover/caprover-frontend/issues/56
                    // This can happen when user creates a new app while a build is in progress.
                    // This results in app.versions being an empty array until the 0th version gets deployed.
                    Logger.error(
                        `App ${app.appName} has invalid deployVersion=${
                            app.deployedVersion
                        }, versions:${JSON.stringify(app.versions)}`
                    )
                } else {
                    lastDeployTime = versionFound[0].timeStamp || ''
                }

                return { ...app, lastDeployTime }
            })

        const searchAppInput = (
            <Input
                placeholder="Search by Name"
                type="text"
                value={self.state.searchTerm}
                defaultValue={self.state.searchTerm}
                onChange={(event) =>
                    self.setState({
                        searchTerm: (event.target.value || '')
                            .trim()
                            .toLowerCase(),
                    })
                }
            />
        )

        return (
            <Card
                extra={!self.props.isMobile && searchAppInput}
                title={
                    <React.Fragment>
                        <span>
                            <CodeOutlined />
                            &nbsp;&nbsp;&nbsp;Your Apps
                        </span>
                        <br />
                        {self.props.isMobile && (
                            <div style={{ marginTop: 8 }}>{searchAppInput}</div>
                        )}
                    </React.Fragment>
                }
            >
                <Row justify="center">
                    {self.props.isMobile ? (
                        appsToRender.map(
                            ({
                                appName = '',
                                hasPersistentData,
                                notExposeAsWebApp,
                                instanceCount,
                                hasDefaultSubDomainSsl,
                            }) => (
                                <Card
                                    type="inner"
                                    title={appName}
                                    key={appName}
                                    extra={
                                        <Link to={this.appDetailPath(appName)}>
                                            Details
                                        </Link>
                                    }
                                    style={{
                                        width: '100%',
                                        marginBottom: 8,
                                    }}
                                >
                                    <p>
                                        Persistent Data:{' '}
                                        {!hasPersistentData ? undefined : (
                                            <span>
                                                <CheckOutlined />
                                            </span>
                                        )}
                                    </p>
                                    <p>
                                        Exposed Webapp:{' '}
                                        {!!notExposeAsWebApp ? undefined : (
                                            <span>
                                                <CheckOutlined />
                                            </span>
                                        )}
                                    </p>
                                    <p>Instance Count: {instanceCount}</p>
                                    <p>
                                        Open in Browser:{' '}
                                        {!!notExposeAsWebApp ? undefined : (
                                            <NewTabLink
                                                url={`http${
                                                    hasDefaultSubDomainSsl
                                                        ? 's'
                                                        : ''
                                                }://${appName}.${
                                                    self.props.rootDomain
                                                }`}
                                            >
                                                <LinkOutlined />{' '}
                                            </NewTabLink>
                                        )}
                                    </p>
                                </Card>
                            )
                        )
                    ) : (
                        <div
                            style={{
                                width: '100%',
                            }}
                        >
                            <Table<TableData>
                                rowKey="appName"
                                columns={self.createColumns()}
                                dataSource={appsToRender}
                                pagination={false}
                                size="middle"
                                onChange={(pagination, filters, sorter) => {
                                    // Persist sorter state
                                    if (!Array.isArray(sorter)) {
                                        window.localStorage.appsSortKey =
                                            sorter.columnKey
                                        window.localStorage.appsSortOrder =
                                            sorter.order
                                    }
                                }}
                            />
                        </div>
                    )}
                </Row>
            </Card>
        )
    }
}

function mapStateToProps(state: any) {
    return {
        isMobile: state.globalReducer.isMobile,
    }
}

export default connect<IMobileComponent, any, any>(
    mapStateToProps,
    undefined
)(AppsTable)
