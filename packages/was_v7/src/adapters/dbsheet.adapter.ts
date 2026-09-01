import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  ComplexQueryDBSheetRecordsParams,
  CreateDBSheetFieldParams,
  CreateDBSheetParams,
  CreateDBSheetRecordParams,
  CreateDBSheetViewParams,
  DBSheet,
  DBSheetData,
  DBSheetFieldsData,
  DBSheetRecord,
  DBSheetRecordsData,
  DBSheetSchemaData,
  DBSheetViewData,
  DeleteDBSheetFieldParams,
  DeleteDBSheetRecordParams,
  QueryDBSheetRecordsParams,
  UpdateDBSheetFieldParams,
  UpdateDBSheetParams,
  UpdateDBSheetRecordParams,
  UpdateDBSheetViewParams,
  WpsDBSheetApiResponse
} from '../types/dbsheet.js';

/**
 * WPS DBSheet (轻维表) API 适配器
 * 基于官方 API 文档：https://open.wps.cn/documents/app-integration-dev/wps365/server/dbsheet/
 *
 * API 基础 URL: https://openapi.wps.cn/v7/coop/dbsheet
 * 认证方式: KSO-1 签名 + Bearer Token
 */
export interface WpsDBSheetAdapter {
  // Schema 操作
  getSchemas(fileId: string): Promise<DBSheetSchemaData>;

  // Sheet 操作
  createSheet(
    fileId: string,
    params: CreateDBSheetParams
  ): Promise<DBSheetData>;
  updateSheetName(
    fileId: string,
    sheetId: number,
    params: UpdateDBSheetParams
  ): Promise<DBSheet>;
  deleteSheet(fileId: string, sheetId: number): Promise<void>;

  // 视图操作
  createView(
    fileId: string,
    sheetId: number,
    params: CreateDBSheetViewParams
  ): Promise<DBSheetViewData>;
  updateViewName(
    fileId: string,
    sheetId: number,
    viewId: string,
    params: UpdateDBSheetViewParams
  ): Promise<DBSheetViewData>;
  deleteView(
    fileId: string,
    sheetId: number,
    viewId: string
  ): Promise<DBSheetViewData>;

  // 字段操作
  createFields(
    fileId: string,
    sheetId: number,
    params: CreateDBSheetFieldParams
  ): Promise<DBSheetFieldsData>;
  updateFields(
    fileId: string,
    sheetId: number,
    params: UpdateDBSheetFieldParams
  ): Promise<DBSheetFieldsData>;
  deleteFields(
    fileId: string,
    sheetId: number,
    params: DeleteDBSheetFieldParams
  ): Promise<DBSheetFieldsData>;

  // 记录操作
  createRecords(
    fileId: string,
    sheetId: number,
    params: CreateDBSheetRecordParams
  ): Promise<DBSheetRecordsData>;
  updateRecords(
    fileId: string,
    sheetId: number,
    params: UpdateDBSheetRecordParams
  ): Promise<DBSheetRecordsData>;
  queryRecords(
    fileId: string,
    sheetId: number,
    params?: QueryDBSheetRecordsParams
  ): Promise<DBSheetRecordsData>;
  complexQueryRecords(
    fileId: string,
    sheetId: number,
    params: ComplexQueryDBSheetRecordsParams
  ): Promise<DBSheetRecordsData>;
  getRecord(
    fileId: string,
    sheetId: number,
    recordId: string
  ): Promise<DBSheetRecord>;
  deleteRecords(
    fileId: string,
    sheetId: number,
    params: DeleteDBSheetRecordParams
  ): Promise<DBSheetRecordsData>;
}

/**
 * 创建 WPS DBSheet 适配器的工厂函数
 */
export function createWpsDBSheetAdapter(
  pluginContainer: AwilixContainer
): WpsDBSheetAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const adapter: WpsDBSheetAdapter = {
    /**
     * 获取文档 Schema 信息
     * GET https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/schema
     */
    async getSchemas(fileId: string): Promise<DBSheetSchemaData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get<DBSheetSchemaData>(
        `/v7/coop/dbsheet/${fileId}/schema`
      );
      return response.data;
    },

    /**
     * 创建 Sheet
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/create
     */
    async createSheet(
      fileId: string,
      params: CreateDBSheetParams
    ): Promise<DBSheetData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<DBSheetData>(
        `/v7/coop/dbsheet/${fileId}/sheets/create`,
        params
      );
      return response.data;
    },

    /**
     * 更新 Sheet
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/update
     */
    async updateSheetName(
      fileId: string,
      sheetId: number,
      params: UpdateDBSheetParams
    ): Promise<DBSheet> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/update`, params);
      return response.data.data.sheet;
    },

    /**
     * 删除 Sheet
     * DELETE https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/delete
     */
    async deleteSheet(fileId: string, sheetId: number): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.post(
        `/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/delete`
      );
    },

    /**
     * 创建视图
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/views
     */
    async createView(
      fileId: string,
      sheetId: number,
      params: CreateDBSheetViewParams
    ): Promise<DBSheetViewData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetViewData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/views`, params);
      return response.data.data;
    },

    /**
     * 更新视图名称
     * PUT https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/views/{view_id}/update
     */
    async updateViewName(
      fileId: string,
      sheetId: number,
      viewId: string,
      params: UpdateDBSheetViewParams
    ): Promise<DBSheetViewData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetViewData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/views/${viewId}`, params);
      return response.data.data;
    },

    /**
     * 删除视图
     * DELETE https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/views/{view_id}/delete
     */
    async deleteView(
      fileId: string,
      sheetId: number,
      viewId: string
    ): Promise<DBSheetViewData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetViewData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/views/${viewId}/delete`);
      return response.data.data;
    },

    /**
     * 创建字段
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/fields/create
     */
    async createFields(
      fileId: string,
      sheetId: number,
      params: CreateDBSheetFieldParams
    ): Promise<DBSheetFieldsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetFieldsData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/fields`, params);
      return response.data.data;
    },

    /**
     * 更新字段
     * PUT https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/fields/update
     */
    async updateFields(
      fileId: string,
      sheetId: number,
      params: UpdateDBSheetFieldParams
    ): Promise<DBSheetFieldsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.put<
        WpsDBSheetApiResponse<DBSheetFieldsData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/fields/update`, params);
      return response.data.data;
    },

    /**
     * 删除字段
     * DELETE https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/fields/delete
     */
    async deleteFields(
      fileId: string,
      sheetId: number,
      params: DeleteDBSheetFieldParams
    ): Promise<DBSheetFieldsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetFieldsData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/fields/delete`, params);
      return response.data.data;
    },

    /**
     * 创建记录
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/create
     */
    async createRecords(
      fileId: string,
      sheetId: number,
      params: CreateDBSheetRecordParams
    ): Promise<DBSheetRecordsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<DBSheetRecordsData>(
        `/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/records/create`,
        params
      );
      return response.data;
    },

    /**
     * 更新记录
     * PUT https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/update
     */
    async updateRecords(
      fileId: string,
      sheetId: number,
      params: UpdateDBSheetRecordParams
    ): Promise<DBSheetRecordsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetRecordsData>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/records/update`, params);
      return response.data.data;
    },

    /**
     * 更新记录
     * PUT https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/batch_delete
     */
    async deleteRecords(
      fileId: string,
      sheetId: number,
      params: DeleteDBSheetRecordParams
    ): Promise<DBSheetRecordsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<
        WpsDBSheetApiResponse<DBSheetRecordsData>
      >(
        `/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/records/batch_delete`,
        params
      );
      return response.data.data;
    },

    /**
     * 查询记录（列举记录）
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records
     */
    async queryRecords(
      fileId: string,
      sheetId: number,
      params?: QueryDBSheetRecordsParams
    ): Promise<DBSheetRecordsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<DBSheetRecordsData>(
        `/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/records`,
        params || {}
      );
      return response.data;
    },

    /**
     * 复杂查询记录
     * POST https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/complex_query
     */
    async complexQueryRecords(
      fileId: string,
      sheetId: number,
      params: ComplexQueryDBSheetRecordsParams
    ): Promise<DBSheetRecordsData> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<DBSheetRecordsData>(
        `/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/records/complex_query`,
        params
      );
      return response.data;
    },

    /**
     * 获取单条记录
     * GET https://openapi.wps.cn/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records/{record_id}
     */
    async getRecord(
      fileId: string,
      sheetId: number,
      recordId: string
    ): Promise<DBSheetRecord> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get<
        WpsDBSheetApiResponse<{ record: DBSheetRecord }>
      >(`/v7/coop/dbsheet/${fileId}/sheets/${sheetId}/records/${recordId}`);
      return response.data.data.record;
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'dbsheet',
  factory: createWpsDBSheetAdapter
};
