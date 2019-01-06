/* tslint:disable */
import {
  UserModel,
  StoreModel,
  SupplierModel,
  StockOrderLineitemModel,
  ReportModel,
  IntegrationModel
} from '../index';

declare var Object: any;
export interface OrgModelInterface {
  "name": string;
  "id"?: any;
  "createdAt"?: Date;
  "updatedAt"?: Date;
  userModels?: UserModel[];
  storeModels?: StoreModel[];
  supplierModels?: SupplierModel[];
  stockOrderLineitemModels?: StockOrderLineitemModel[];
  reportModels?: ReportModel[];
  productModels?: any[];
  inventoryModels?: any[];
  syncModels?: any[];
  integrationModels?: IntegrationModel[];
  salesModels?: any[];
  salesLineItemsModels?: any[];
  categoryModels?: any[];
}

export class OrgModel implements OrgModelInterface {
  "name": string;
  "id": any;
  "createdAt": Date;
  "updatedAt": Date;
  userModels: UserModel[];
  storeModels: StoreModel[];
  supplierModels: SupplierModel[];
  stockOrderLineitemModels: StockOrderLineitemModel[];
  reportModels: ReportModel[];
  productModels: any[];
  inventoryModels: any[];
  syncModels: any[];
  integrationModels: IntegrationModel[];
  salesModels: any[];
  salesLineItemsModels: any[];
  categoryModels: any[];
  constructor(data?: OrgModelInterface) {
    Object.assign(this, data);
  }
  /**
   * The name of the model represented by this $resource,
   * i.e. `OrgModel`.
   */
  public static getModelName() {
    return "OrgModel";
  }
  /**
  * @method factory
  * @author Jonathan Casarrubias
  * @license MIT
  * This method creates an instance of OrgModel for dynamic purposes.
  **/
  public static factory(data: OrgModelInterface): OrgModel{
    return new OrgModel(data);
  }
  /**
  * @method getModelDefinition
  * @author Julien Ledun
  * @license MIT
  * This method returns an object that represents some of the model
  * definitions.
  **/
  public static getModelDefinition() {
    return {
      name: 'OrgModel',
      plural: 'OrgModels',
      path: 'OrgModels',
      properties: {
        "name": {
          name: 'name',
          type: 'string'
        },
        "id": {
          name: 'id',
          type: 'any'
        },
        "createdAt": {
          name: 'createdAt',
          type: 'Date',
          default: new Date(0)
        },
        "updatedAt": {
          name: 'updatedAt',
          type: 'Date',
          default: new Date(0)
        },
      },
      relations: {
        userModels: {
          name: 'userModels',
          type: 'UserModel[]',
          model: 'UserModel'
        },
        storeModels: {
          name: 'storeModels',
          type: 'StoreModel[]',
          model: 'StoreModel'
        },
        supplierModels: {
          name: 'supplierModels',
          type: 'SupplierModel[]',
          model: 'SupplierModel'
        },
        stockOrderLineitemModels: {
          name: 'stockOrderLineitemModels',
          type: 'StockOrderLineitemModel[]',
          model: 'StockOrderLineitemModel'
        },
        reportModels: {
          name: 'reportModels',
          type: 'ReportModel[]',
          model: 'ReportModel'
        },
        productModels: {
          name: 'productModels',
          type: 'any[]',
          model: ''
        },
        inventoryModels: {
          name: 'inventoryModels',
          type: 'any[]',
          model: ''
        },
        syncModels: {
          name: 'syncModels',
          type: 'any[]',
          model: ''
        },
        integrationModels: {
          name: 'integrationModels',
          type: 'IntegrationModel[]',
          model: 'IntegrationModel'
        },
        salesModels: {
          name: 'salesModels',
          type: 'any[]',
          model: ''
        },
        salesLineItemsModels: {
          name: 'salesLineItemsModels',
          type: 'any[]',
          model: ''
        },
        categoryModels: {
          name: 'categoryModels',
          type: 'any[]',
          model: ''
        },
      }
    }
  }
}
