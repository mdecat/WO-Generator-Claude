/** Base Dataverse OData response envelope */
export interface ODataResponse<T> {
  '@odata.context': string;
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

/** Single entity response wrapper */
export type ODataSingleResponse<T> = T & {
  '@odata.context': string;
  '@odata.etag'?: string;
};

/** OData error shape */
export interface ODataError {
  error: {
    code: string;
    message: string;
    innererror?: {
      message: string;
      type: string;
      stacktrace: string;
    };
  };
}

/** Batch request item */
export interface BatchRequestItem {
  entitySetName: string;
  body: Record<string, unknown>;
  contentId?: string;
}

/** Batch response item */
export interface BatchResponseItem {
  contentId?: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  error?: string;
}

/** Power Platform Discovery — environment instance */
export interface DataverseEnvironment {
  Id: string;
  UniqueName: string;
  UrlName: string;
  FriendlyName: string;
  State: number;
  StateIsMigrated: boolean;
  ApiUrl: string;
  Url: string;
  Version: string;
  EnvironmentType: string;
  IsDefault: boolean;
  TenantId: string;
  OrganizationId: string;
}
