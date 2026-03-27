export const userStatuses = ['Active', 'Pending MFA', 'Invited', 'Suspended'] as const
export type UserStatus = (typeof userStatuses)[number]

export interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  status: UserStatus
  team: string
  lastActive: string
}

export const userRoleOptions = [
  'Workspace Admin',
  'Operations Lead',
  'Support Admin',
  'Finance Reviewer',
  'Security Analyst',
  'Billing Operator',
  'Audit Reviewer',
] as const

export const userTeamOptions = [
  'Platform',
  'Operations',
  'Support',
  'Finance',
  'Security',
  'Compliance',
] as const

export const mockUsers: UserRecord[] = [
  {
    id: 'usr_001',
    name: 'Aria Chen',
    email: 'aria.chen@wps.local',
    role: 'Operations Lead',
    status: 'Active',
    team: 'Operations',
    lastActive: '2h ago',
  },
  {
    id: 'usr_002',
    name: 'Mason Wu',
    email: 'mason.wu@wps.local',
    role: 'Support Admin',
    status: 'Pending MFA',
    team: 'Support',
    lastActive: '5h ago',
  },
  {
    id: 'usr_003',
    name: 'Nina Brooks',
    email: 'nina.brooks@wps.local',
    role: 'Finance Reviewer',
    status: 'Invited',
    team: 'Finance',
    lastActive: '1d ago',
  },
  {
    id: 'usr_004',
    name: 'Luca Ramos',
    email: 'luca.ramos@wps.local',
    role: 'Security Analyst',
    status: 'Active',
    team: 'Security',
    lastActive: '30m ago',
  },
  {
    id: 'usr_005',
    name: 'Evelyn Park',
    email: 'evelyn.park@wps.local',
    role: 'Workspace Admin',
    status: 'Active',
    team: 'Platform',
    lastActive: '10m ago',
  },
  {
    id: 'usr_006',
    name: 'Jonas Ford',
    email: 'jonas.ford@wps.local',
    role: 'Billing Operator',
    status: 'Suspended',
    team: 'Finance',
    lastActive: '4d ago',
  },
  {
    id: 'usr_007',
    name: 'Sophia Tran',
    email: 'sophia.tran@wps.local',
    role: 'Support Admin',
    status: 'Active',
    team: 'Support',
    lastActive: '3h ago',
  },
  {
    id: 'usr_008',
    name: 'Aiden Cole',
    email: 'aiden.cole@wps.local',
    role: 'Audit Reviewer',
    status: 'Invited',
    team: 'Compliance',
    lastActive: '2d ago',
  },
]
