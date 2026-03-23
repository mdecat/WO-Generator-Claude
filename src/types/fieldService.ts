/** msdyn_incidenttype */
export interface IncidentType {
  msdyn_incidenttypeid: string;
  msdyn_name: string;
  msdyn_description?: string;
  msdyn_estimatedduration?: number; // minutes
  '_msdyn_defaultworkordertype_value'?: string;
  'msdyn_defaultworkordertype@OData.Community.Display.V1.FormattedValue'?: string;
}

/** msdyn_incidenttypecharacteristic */
export interface IncidentTypeCharacteristic {
  msdyn_incidenttypecharacteristicid: string;
  msdyn_name: string; // auto-set to characteristic name by Dataverse
  '_msdyn_characteristic_value': string;
  '_msdyn_ratingvalue_value'?: string;
  // annotations from odata.include-annotations="*" (no $expand needed)
  '_msdyn_characteristic_value@OData.Community.Display.V1.FormattedValue'?: string;
  '_msdyn_ratingvalue_value@OData.Community.Display.V1.FormattedValue'?: string;
}

/** msdyn_incidenttypeservicetask */
export interface IncidentTypeServiceTask {
  msdyn_incidenttypeservicetaskid: string;
  msdyn_name: string;
  msdyn_estimatedduration?: number; // minutes
  '_msdyn_tasktype_value'?: string;
  '_msdyn_tasktype_value@OData.Community.Display.V1.FormattedValue'?: string;
}

/** msdyn_incidenttypeproduct */
export interface IncidentTypeProduct {
  msdyn_incidenttypeproductid: string;
  msdyn_name: string;
  msdyn_quantity?: number;
  '_msdyn_product_value'?: string;
  '_msdyn_unit_value'?: string;
  '_msdyn_product_value@OData.Community.Display.V1.FormattedValue'?: string;
  '_msdyn_unit_value@OData.Community.Display.V1.FormattedValue'?: string;
}

/** Full incident type details with related records */
export interface IncidentTypeDetails {
  incidentType: IncidentType;
  characteristics: IncidentTypeCharacteristic[];
  serviceTasks: IncidentTypeServiceTask[];
  products: IncidentTypeProduct[];
  totalEstimatedDuration: number; // minutes (sum of service tasks)
}

/** msdyn_workordertype */
export interface WorkOrderType {
  msdyn_workordertypeid: string;
  msdyn_name: string;
}

/** msdyn_priority */
export interface Priority {
  msdyn_priorityid: string;
  msdyn_name: string;
  msdyn_prioritylevel?: number;
}

/** msdyn_serviceterritory */
export interface ServiceTerritory {
  msdyn_serviceterritoryid: string;
  msdyn_name: string;
}

/** account (as Service Account) */
export interface ServiceAccount {
  accountid: string;
  name: string;
  address1_latitude?: number;
  address1_longitude?: number;
  address1_line1?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  '_msdyn_serviceterritory_value'?: string;
  '_transactioncurrencyid_value'?: string;
  '_defaultpricelevelid_value'?: string;
  'msdyn_serviceterritory@OData.Community.Display.V1.FormattedValue'?: string;
  'defaultpricelevelid@OData.Community.Display.V1.FormattedValue'?: string;
}

/** msdyn_workorder */
export interface WorkOrder {
  msdyn_workorderid?: string;
  msdyn_name?: string;
  'msdyn_serviceaccount@odata.bind'?: string;
  'msdyn_billingaccount@odata.bind'?: string;
  'msdyn_workordertype@odata.bind'?: string;
  'msdyn_incidenttype@odata.bind'?: string;
  'msdyn_priority@odata.bind'?: string;
  'msdyn_pricelist@odata.bind'?: string;
  msdyn_timefrompromised?: string; // ISO date string
  msdyn_timetopromised?: string;   // ISO date string
  msdyn_systemstatus?: number;     // 690970000 = Open-Unscheduled
  msdyn_description?: string;
}

/** Work Order system status option set */
export enum WorkOrderSystemStatus {
  OpenUnscheduled = 690970000,
  OpenPartiallyScheduled = 690970001,
  OpenScheduled = 690970002,
  OpenPartiallyCompleted = 690970003,
  OpenCompleted = 690970004,
  Closed = 690970005,
  ClosedCanceled = 690970006,
}

/** pricelevel */
export interface PriceList {
  pricelevelid: string;
  name: string;
}
