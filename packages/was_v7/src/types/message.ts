/**
 * WPS V7 消息与会话相关类型定义
 * 严格按照官方API文档定义
 * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/create-msg.html
 */

// 基础消息类型 - 按照文档定义
export type MessageType =
  | 'text'
  | 'rich_text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'card';

// 接收者类型 - 按照文档定义
export type ReceiverType = 'company' | 'dept' | 'user' | 'chat' | 'user_group';

// 接收者信息 - 按照文档定义
export interface MessageReceiver {
  partner_id?: string;
  type: ReceiverType;
  id: string;
}

// @人相关类型 - 按照文档定义
export interface MentionItem {
  id: string; // 索引ID，不是user_id
  user_id: string; // 实际的用户ID
  name?: string; // 显示名称
}

// 不合法接收者信息 - 按照文档响应结构
export interface InvalidReceiver {
  partner_id: string;
  receiver_ids: string[];
  type: ReceiverType;
}

// 文本消息内容 - 按照文档定义
export interface TextMessageContent {
  text: string;
}

// 富文本消息内容 - 按照文档定义
export interface RichTextMessageContent {
  rich_text: {
    content: string;
  };
}

// 图片消息内容 - 按照文档定义
export interface ImageMessageContent {
  image: {
    storage_key: string;
    width?: number;
    height?: number;
    size?: number;
  };
}

// 文件消息内容 - 按照文档定义
export interface FileMessageContent {
  file: {
    storage_key: string;
    name: string;
    size?: number;
    suffix?: string;
  };
}

// 音频消息内容 - 按照文档定义
export interface AudioMessageContent {
  audio: {
    storage_key: string;
    duration?: number;
    size?: number;
  };
}

// 视频媒体信息 - 按照文档定义
export interface VideoMedia {
  codec: string;
  cover_storage_key?: string;
  duration?: number;
  format?: string;
  height?: number;
  size?: number;
  width?: number;
}

// 视频消息内容 - 按照文档定义
export interface VideoMessageContent {
  video: {
    media: VideoMedia;
    storage_key: string;
  };
}

// 卡片链接 - 按照文档定义
export interface CardLink {
  url: string;
  android_url?: string;
  ios_url?: string;
  pc_url?: string;
}

// 卡片配置 - 按照文档定义
export interface CardConfig {
  wide_screen_mode?: boolean;
  enable_forward?: boolean;
}

// 卡片多语言项 - 按照文档定义
export interface CardI18nItem {
  language?: string;
  elements?: any[];
  header?: any;
}

// 卡片消息内容 - 按照文档定义
export interface CardMessageContent {
  card: {
    config: CardConfig;
    i18n_items: CardI18nItem[];
    link?: CardLink;
  };
}

// 消息内容类型 - 按照文档定义
export type MessageContent =
  | TextMessageContent
  | RichTextMessageContent
  | ImageMessageContent
  | FileMessageContent
  | AudioMessageContent
  | VideoMessageContent
  | CardMessageContent;

// 发送消息请求参数 - 严格按照文档定义
export interface SendMessageParams {
  type: MessageType;
  receivers: MessageReceiver[];
  mentions: MentionItem[];
  content: MessageContent;
}

// 发送消息响应 - 严格按照文档响应结构
export interface SendMessageResponse {
  message_id: string;
  invalid_receivers?: InvalidReceiver[];
}

// 以下接口暂时保留，但需要根据具体文档调整

// 更新消息请求参数
export interface UpdateMessageParams {
  message_id: string;
  type: MessageType;
  content: MessageContent;
}

// 撤回消息请求参数
export interface RevokeMessageParams {
  message_id: string;
}

// 根据三方业务ID获取消息ID请求参数
export interface GetMessageIdByBusinessIdParams {
  business_id: string;
}

// 根据三方业务ID获取消息ID响应
export interface GetMessageIdByBusinessIdResponse {
  message_id: string;
}

// 获取会话历史消息请求参数
export interface GetChatHistoryParams {
  chat_id: string;
  start_time?: string;
  end_time?: string;
  page_size?: number;
  page_token?: string;
}

// 消息信息
export interface MessageInfo {
  message_id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'bot';
  type: MessageType;
  content: MessageContent;
  create_time: string;
  update_time?: string;
  mentions?: MentionItem[];
}

// 获取会话历史消息响应
export interface GetChatHistoryResponse {
  items: MessageInfo[];
  page_token?: string;
  has_more: boolean;
}

// 获取指定消息内容请求参数
export interface GetMessageContentParams {
  message_id: string;
}

// 获取指定消息内容响应
export interface GetMessageContentResponse extends MessageInfo {}

// 会话类型
export type ChatType = 'single' | 'group';

// 创建会话请求参数
export interface CreateChatParams {
  type: ChatType;
  name?: string; // 群聊名称，单聊时可不传
  users: string[]; // 用户ID列表
  description?: string; // 群聊描述
}

// 创建会话响应
export interface CreateChatResponse {
  chat_id: string;
}

// 解散群聊请求参数
export interface DismissChatParams {
  chat_id: string;
}

// 获取会话列表请求参数
export interface GetChatListParams {
  page_size?: number;
  page_token?: string;
  chat_type?: ChatType;
}

// 会话信息
export interface ChatInfo {
  chat_id: string;
  name?: string;
  type: ChatType;
  description?: string;
  avatar?: string;
  owner_id?: string;
  member_count?: number;
  create_time: string;
  update_time?: string;
}

// 获取会话列表响应
export interface GetChatListResponse {
  items: ChatInfo[];
  page_token?: string;
  has_more: boolean;
}

// 批量获取会话信息请求参数
export interface BatchGetChatInfoParams {
  chat_ids: string[];
}

// 批量获取会话信息响应
export interface BatchGetChatInfoResponse {
  items: ChatInfo[];
}

// 更新会话信息请求参数
export interface UpdateChatParams {
  chat_id: string;
  name?: string;
  description?: string;
  avatar?: string;
}

// 批量添加群成员请求参数
export interface BatchAddMembersParams {
  chat_id: string;
  user_ids: string[];
}

// 群成员信息
export interface ChatMember {
  user_id: string;
  name?: string;
  avatar?: string;
  join_time: string;
  role?: 'owner' | 'admin' | 'member';
}

// 获取群成员列表请求参数
export interface GetChatMembersParams {
  chat_id: string;
  page_size?: number;
  page_token?: string;
}

// 获取群成员列表响应
export interface GetChatMembersResponse {
  items: ChatMember[];
  page_token?: string;
  has_more: boolean;
}

// 批量删除群成员请求参数
export interface BatchRemoveMembersParams {
  chat_id: string;
  user_ids: string[];
}

// 获取用户会话未读数请求参数
export interface GetUserUnreadCountParams {
  user_id: string;
}

// 获取用户会话未读数响应
export interface GetUserUnreadCountResponse {
  unread_count: number;
}

// 根据用户ID获取会话ID请求参数
export interface GetChatIdByUserIdParams {
  user_id: string;
}

// 根据用户ID获取会话ID响应
export interface GetChatIdByUserIdResponse {
  chat_id: string;
}

// 创建部门群请求参数
export interface CreateDeptChatParams {
  dept_id: string;
  name?: string;
}

// 创建部门群响应
export interface CreateDeptChatResponse {
  chat_id: string;
}

// 部门群转普通群请求参数
export interface ConvertDeptChatParams {
  chat_id: string;
}

// 指定部门群群主请求参数
export interface SetDeptChatOwnerParams {
  chat_id: string;
  owner_id: string;
}
