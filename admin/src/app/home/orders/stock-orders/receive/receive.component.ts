import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest, Subscription} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {DatePipe} from '@angular/common';
import {EventSourceService} from '../../../../shared/services/event-source.service';
import {ModalDirective} from 'ngx-bootstrap';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: ['./receive.component.scss']
})
export class ReceiveComponent implements OnInit, OnDestroy {
  @ViewChild('discrepancyModal') public discrepancyModal: ModalDirective;
  @ViewChild('searchInput') public searchInputRef: ElementRef;

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public receivedLineItems: Array<any>;
  public notReceivedLineItems: Array<any>;
  public totalReceivedLineItems: number;
  public totalNotReceivedLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string = '';
  public totalPages: number;
  public currentPageReceived: number = 1;
  public currentPageNotReceived: number = 1;
  public lineItemsLimitPerPage: number = 100;
  public creatingTransferOrder: boolean = false;
  public creatingPurchaseOrderVend: boolean = false;
  public reportStates: any = constants.REPORT_STATES;
  public isWarehouser: boolean = false;
  public editable: boolean;
  public searchSKUFocused: boolean = true;
  public enableBarcode: boolean = true;
  public discrepancyOrderItem: any;
  private subscriptions: Subscription[] = [];
  public sortAscending = true;
  public sortColumn = 'productModelSku';

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private _eventSourceService: EventSourceService,
              private auth: LoopBackAuth) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.order = data.stockOrderDetails[0];
        this.getNotReceivedStockOrderLineItems();
        this.getReceivedStockOrderLineItems();
      },
      error => {
        console.log('error', error)
      });

    //update order to state "Approval in Process" from "Generated"
    if (this.order.state === constants.REPORT_STATES.RECEIVING_PENDING) {
      this.orgModelApi.updateByIdReportModels(this.userProfile.orgModelId, this.order.id, {
        state: constants.REPORT_STATES.RECEIVING_IN_PROCESS
      })
        .subscribe((data: any) => {
          console.log('updated report state to receiving in process', data);
        });
    }

    if (this.order.state === constants.REPORT_STATES.RECEIVING_PENDING ||
      this.order.state === constants.REPORT_STATES.RECEIVING_IN_PROCESS ||
      this.order.state === constants.REPORT_STATES.RECEIVING_FAILURE) {
      this.editable = true;
    }

  }

  getReceivedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {

    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    if (!productModelId) {
      this.searchSKUText = ''
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    const filter: any = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        fulfilled: true,
        receivedQuantity: {
          gt: 0
        },
        productModelId: productModelId
      },
      include: {
        relation: 'productModel'
      },
      limit: limit,
      skip: skip,
      order: 'categoryModelName ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter: any = {
      reportModelId: this.order.id,
      approved: true,
      fulfilled: true,
      receivedQuantity: {
        gt: 0
      }
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageReceived = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalReceivedLineItems = data[1].count;
        this.receivedLineItems = data[0];
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  getNotReceivedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    if (!productModelId) {
      this.searchSKUText = ''
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        fulfilled: true,
        received: false,
        productModelId: productModelId
      },
      include: {
        relation: 'productModel',
      },
      limit: limit,
      skip: skip,
      order: 'categoryModelName ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter = {
      reportModelId: this.order.id,
      approved: true,
      fulfilled: true,
      received: false
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageNotReceived = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalNotReceivedLineItems = data[1].count;
        for (var i = 0; i < data[0].length; i++) {
          // Prefill value if  Manual mode && Nothing has been recieved yet
          if (!this.enableBarcode && data[0][i].receivedQuantity === 0) {
            data[0][i].receivedQuantity = data[0][i].fulfilledQuantity;
          }
        }
        this.notReceivedLineItems = data[0];
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  searchAndIncrementProduct(sku?: string, force: boolean = false) {
    this.discrepancyModal.hide()
    this.loading = true;
    this.orgModelApi.scanBarcodeStockOrder(this.userProfile.orgModelId,
      'receive',
      sku,
      this.order.id,
      force)
      .subscribe((searchedOrderItem) => {
        if (searchedOrderItem.showDiscrepancyAlert) {
          this.discrepancyOrderItem = searchedOrderItem;
          this.discrepancyModal.show()
        } else {
          this.toastr.success('Row updated');
        }
        this.searchInputRef.nativeElement.focus();
        this.searchInputRef.nativeElement.select();
        this.receivedLineItems = [searchedOrderItem];
        this.totalReceivedLineItems = this.receivedLineItems.length;
        if (!searchedOrderItem.received) {
          this.notReceivedLineItems = [searchedOrderItem];
        } else {
          this.notReceivedLineItems = [];
        }
        this.totalNotReceivedLineItems = this.notReceivedLineItems.length;
        this.loading = false;
      }, error => {
        this.loading = false;
        this.toastr.error(error.message);
        this.notReceivedLineItems = [];
        this.receivedLineItems = [];
        this.totalReceivedLineItems = 0;
        this.totalNotReceivedLineItems = 0;
      });
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
        sku: sku
      }
    }).subscribe((data: any) => {
      if (data.length) {
        this.getReceivedStockOrderLineItems(1, 0, data[0].id);
        this.getNotReceivedStockOrderLineItems(1, 0, data[0].id);
      }
      else {
        this.loading = false;
        this.currentPageNotReceived = 1;
        this.totalNotReceivedLineItems = 0;
        this.notReceivedLineItems = [];
        this.receivedLineItems = [];
        this.totalReceivedLineItems = 0;
        this.currentPageReceived = 1;
      }
    })
  }

  updateLineItems(lineItems, data: any) {
    this.loading = true;
    let lineItemsIDs: Array<string> = [];
    if (lineItems instanceof Array) {
      for (var i = 0; i < lineItems.length; i++) {
        lineItemsIDs.push(lineItems[i].id);
      }
    }
    else {
      lineItemsIDs.push(lineItems.id)
    }
    this.orgModelApi.updateAllStockOrderLineItemModels(this.userProfile.orgModelId, this.order.id, lineItemsIDs, data)
      .subscribe((res: any) => {
          this.getReceivedStockOrderLineItems();
          this.getNotReceivedStockOrderLineItems();
          console.log('approved', res);
          this.toastr.success('Row Updated');
        },
        err => {
          this.toastr.error('Error Updating Row');
          console.log('err', err);
          this.loading = false;
        });
  }

  receiveItem(lineItem) {
    this.updateLineItems(lineItem, {
      received: true,
      receivedQuantity: lineItem.receivedQuantity
    });
  }

  removeItem(lineItem) {
    this.updateLineItems(lineItem, {received: false, receivedQuantity: 0});
  }

  getOrderDetails() {
    let previousState = this.order.state;
    this.loading = true;
    this.orgModelApi.getReportModels(this.userProfile.orgModelId, {
      where: {
        id: this.order.id
      }
    })
      .subscribe((data: any) => {
          this.order = data[0];
          //fetch line items only if the report status changes from executing to generated
          if (this.order.state === this.reportStates.GENERATED && previousState !== this.reportStates.GENERATED) {
            this.getNotReceivedStockOrderLineItems();
            this.getReceivedStockOrderLineItems();
          }
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Error updating order state, please refresh');
        });
  };

  receiveConsignment() {
    if (!this.totalReceivedLineItems) {
      this.toastr.error('Please receive at least one item to send order to supplier');
    } else {
      this.loading = true;
      this.creatingPurchaseOrderVend = true;
      this.orgModelApi.receiveConsignment(
          this.userProfile.orgModelId,
          this.order.id
      ).subscribe(recieveRequest => {
        this.toastr.info('Receiving consignment...');
        this.loading = false;
        this.waitForRecieveWorker(recieveRequest.callId);
      }, error => {
        this.loading = false;
        this.toastr.error('Error in receiving order');
      });
    }
  }

  waitForRecieveWorker(callId) {
    const EventSourceUrl = `/notification/${callId}/waitForResponse`;
    this.subscriptions.push(
        this._eventSourceService.connectToStream(EventSourceUrl)
            .subscribe(([event, es]) => {
              console.log(event);
             if (event.data.success === true) {
                es.close();
                this.creatingPurchaseOrderVend = false;
                this._router.navigate(['/orders/stock-orders']);
                this.toastr.success('Order received successfully');
              } else {
                this.creatingPurchaseOrderVend = false;
                this.toastr.error('Error in receiving order');
              }
            })
    );
  }

  downloadOrderCSV() {
    this.loading = true;
    this.orgModelApi.downloadReportModelCSV(this.userProfile.orgModelId, this.order.id).subscribe((data) => {
      const link = document.createElement('a');
      link.href = data;
      link.download = this.order.name;
      link.click();
      this.loading = false;
    }, err=> {
      this.loading = false;
      console.log(err);
    })
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe()
      }
    })
  }

  /**
   * @description If the scan mode is changed
   * to barcode scanning, then focus is set back to the sku
   * search bar
   */
  changeScanMode() {
    this.getNotReceivedStockOrderLineItems();
    this.getReceivedStockOrderLineItems();
    this.searchSKUText = ''
    if (this.enableBarcode) {
      this.searchSKUFocused = true;
    }
    else {
      this.searchSKUFocused = false;
    }
  }

  /**
   * @description Code to detect barcode scanner input and
   * calls the search sku function
   * @param searchText
   */
  barcodeSearchSKU($event) {
    if (this.enableBarcode && this.searchSKUText !== '') {
      this.searchAndIncrementProduct(this.searchSKUText);
      $event.target.select();
    }
  }
}

class box {
  public boxNumber: number;
  public boxName: string;
  public totalItems: number;
  public isOpen: boolean;
}
