import {ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, Subscription} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {Color, BaseChartDirective, Label} from 'ng2-charts';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {DatePipe} from '@angular/common';
import {EventSourceService} from '../../../../shared/services/event-source.service';
import {AddProductModalComponent} from '../../shared-components/add-product-modal/add-product-modal.component';
import Utils from '../../../../shared/constants/utils';
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import {DeleteOrderComponent} from "../../shared-components/delete-order/delete-order.component";
import {SharedDataService} from '../../../../shared/services/shared-data.service';
import {delay} from 'rxjs/operators';

@Component({
  selector: 'app-generated',
  templateUrl: './generated.component.html',
  styleUrls: ['./generated.component.scss']
})
export class GeneratedComponent implements OnInit, OnDestroy {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public approvedLineItems: Array<any>;
  public notApprovedLineItems: Array<any>;
  public totalApprovedLineItems: number;
  public totalNotApprovedLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string;
  // public totalPages: number;
  public currentPageApproved: number = 1;
  public currentPageNotApproved: number = 1;
  public lineItemsLimitPerPage: number = 100;
  public creatingTransferOrder: boolean = false;
  public creatingPurchaseOrderVend: boolean = false;
  public reportStates: any = constants.REPORT_STATES;
  public isWarehouser: boolean = false;
  public boxes: Array<any> = [];
  public selectedBox = null;
  public editable: boolean;
  private subscriptions: Subscription[] = [];
  public sortAscending = true;
  public sortColumn = 'productModelSku';
  public emailModalData: any = {
    sendEmail: true,
    to: '',
    cc: '',
    bcc: '',
  };
  public showAddProductModal = false;
  public bsModalRef: BsModalRef;
  public toValidEmailCounter: number = 0;
  public toInvalidEmailCounter: number = 0;
  public ccValidEmailCounter: number = 0;
  public ccInvalidEmailCounter: number = 0;
  public bccValidEmailCounter: number = 0;
  public bccInvalidEmailCounter: number = 0;
  public searchEntry = '';
  public salesRangeDates = [];
  public lineChartData: Array<any> = [{
    data: [0, 0, 0, 0, 0, 0, 0],
    label: 'Sales History'
  }];
  public lineChartLabels: Array<Label>;
  public lineChartOptions: any = {
    responsive: true
  };
  public lineChartColours: Array<any> = [
    { // green
      backgroundColor: '#4dbd74b5',
      borderColor: '#4dbd74',
      pointBackgroundColor: 'rgba(148,159,177,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(148,159,177,0.8)'
    }
  ];
  public lineChartLegend = true;
  public lineChartType = 'line';
  public loadingGraph: boolean = false;
  public graphNumberOfDays: number = 7;
  public isSmallDevice = this.sharedDataService.getIsSmallDevice();

  @ViewChild(BaseChartDirective) chart: BaseChartDirective;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private _eventSourceService: EventSourceService,
              private changeDetector: ChangeDetectorRef,
              private auth: LoopBackAuth,
              private modalService: BsModalService,
              private sharedDataService: SharedDataService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.order = data.stockOrderDetails[0];
        this.emailModalData.to = this.order.supplierModel ? ( this.order.supplierModel.email ? this.order.supplierModel.email : '') : '';
        this.getNotApprovedStockOrderLineItems();
        this.getApprovedStockOrderLineItems();
        if(this.userProfile.integrationType === 'vend') {
          this.listenItemSyncChanges();
        }
      },
      error => {
        console.log('error', error)
      });


    if (this.order.state === constants.REPORT_STATES.GENERATED ||
      this.order.state === constants.REPORT_STATES.APPROVAL_IN_PROCESS ||
      this.order.state === constants.REPORT_STATES.ERROR_SENDING_TO_SUPPLIER ||
      this.order.state === constants.REPORT_STATES.PROCESSING_FAILURE) {
      this.editable = true;
    }

    //update order to state "Approval in Process" from "Generated"
    if (this.order.state === constants.REPORT_STATES.GENERATED) {
      this.orgModelApi.updateByIdReportModels(this.userProfile.orgModelId, this.order.id, {
        state: constants.REPORT_STATES.APPROVAL_IN_PROCESS
      })
        .subscribe((data: any) => {
          console.log('updated report state to approval in process', data);
        });
    }
  }

  getApprovedStockOrderLineItems(limit?: number, skip?: number, productModelIds?: Array<string>) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 10;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let whereFilter = {
      reportModelId: this.order.id,
      approved: true
    };
    if (productModelIds && productModelIds.length) {
      whereFilter['productModelId'] = {
        inq: productModelIds
      };
    }
    let filter = {
      where: whereFilter,
      include: [
        {
          relation: 'productModel'
        },
        {
          relation: 'commentModels',
          scope: {
            include: 'userModel'
          }
        }
      ],
      limit: limit,
      skip: skip,
      order: 'categoryModelName ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter = {
      reportModelId: this.order.id,
      approved: true
    };
    if (productModelIds && productModelIds.length)
      countFilter['productModelId'] = {inq: productModelIds};
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageApproved = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalApprovedLineItems = data[1].count;
        this.approvedLineItems = data[0];
        this.approvedLineItems.forEach(x => {
          x.isCollapsed = true;
        });
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  getNotApprovedStockOrderLineItems(limit?: number, skip?: number, productModelIds?: Array<string>) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 10;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let whereFilter = {
      reportModelId: this.order.id,
      approved: false
    };
    if (productModelIds && productModelIds.length) {
      whereFilter['productModelId'] = {
        inq: productModelIds
      };
    }
    let filter = {
      where: whereFilter,
      include: [
        {
          relation: 'productModel'
        },
        {
          relation: 'commentModels',
          scope: {
            include: 'userModel'
          }
        }
      ],
      limit: limit,
      skip: skip,
      order: 'categoryModelName ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter = {
      reportModelId: this.order.id,
      approved: false
    };
    if (productModelIds && productModelIds.length)
      countFilter['productModelId'] = {inq: productModelIds};
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageNotApproved = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalNotApprovedLineItems = data[1].count;
        this.notApprovedLineItems = data[0];
        this.notApprovedLineItems.forEach(x => {
          x.isCollapsed = true;
        });
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    var pattern = new RegExp('.*' + sku + '.*', "i");
    /* case-insensitive RegExp search */
    var filterData = pattern.toString();
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
        sku: {"regexp": filterData}
      }
    })
      .subscribe((data) => {
        this.loadStockItemsByProducts(data);
      })
  }

  loadStockItemsByProducts(data: any) {
    if (data.length) {
      var productModelIds = data.map(function filterProductIds(eachProduct) {
        return eachProduct.id;
      });
      this.getApprovedStockOrderLineItems(this.lineItemsLimitPerPage, 0, productModelIds);
      this.getNotApprovedStockOrderLineItems(this.lineItemsLimitPerPage, 0, productModelIds);
    }
    else {
      this.loading = false;
      this.currentPageNotApproved = 1;
      this.totalNotApprovedLineItems = 0;
      this.notApprovedLineItems = [];
      this.approvedLineItems = [];
      this.totalApprovedLineItems = 0;
      this.currentPageApproved = 1;
    }
  };

  createTransferOrder() {
    if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to create Transfer Order in MSD');
    } else {
      this.creatingTransferOrder = true;
      this.loading = true;
      this.orgModelApi.createTransferOrderMSD(
        this.userProfile.orgModelId,
        this.order.id,
        this.emailModalData.sendEmail,
        {
          to: this.emailModalData.to.split(','),
          cc: this.emailModalData.cc ? this.emailModalData.cc.split(',') : [],
          bcc: this.emailModalData.bcc ? this.emailModalData.bcc.split(',') : []
        }
      ).subscribe(transferOrderRequest => {
        this.loading = false;
        this.toastr.info('Creating Transfer Order');
        this._router.navigate(['/orders/stock-orders']);
        // this.waitForGeneration(transferOrderRequest.callId);
      }, error1 => {
        this.loading = false;
        this.creatingTransferOrder = false;
        this.toastr.error('Error in creating transfer order in MSD')
      });
    }
  }

  toEmailValidation() {
    this.toValidEmailCounter = 0;
    this.toInvalidEmailCounter = 0;
    this.emailModalData.to = this.emailModalData.to + ' ';
    let toEmailArray = this.emailModalData.to.split(',');
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.toValidEmailCounter++;
        }
        else {
          this.toInvalidEmailCounter++;
        }
      })
    }
  }

  toEmailEmpty() {
    this.emailModalData.to = this.emailModalData.to.trim();
    if (this.emailModalData.to === '') {
      this.toValidEmailCounter = 0;
      this.toInvalidEmailCounter = 0;
    }
  }

  ccEmailValidation() {
    this.ccValidEmailCounter = 0;
    this.ccInvalidEmailCounter = 0;
    this.emailModalData.cc = this.emailModalData.cc + ' ';
    let toEmailArray = this.emailModalData.cc.split(',');
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.ccValidEmailCounter++;
        }
        else {
          this.ccInvalidEmailCounter++;
        }
      })
    }
  }

  ccEmailEmpty() {
    this.emailModalData.cc = this.emailModalData.cc.trim();
    if (this.emailModalData.cc === '') {
      this.ccValidEmailCounter = 0;
      this.ccInvalidEmailCounter = 0;
    }
  }

  bccEmailValidation() {
    this.bccValidEmailCounter = 0;
    this.bccInvalidEmailCounter = 0;
    this.emailModalData.bcc = this.emailModalData.bcc + ' ';
    let toEmailArray = this.emailModalData.bcc.split(',');
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.bccValidEmailCounter++;
        }
        else {
          this.bccInvalidEmailCounter++;
        }
      })
    }
  }

  bccEmailEmpty() {
    this.emailModalData.bcc = this.emailModalData.bcc.trim();
    if (this.emailModalData.bcc === '') {
      this.bccValidEmailCounter = 0;
      this.bccInvalidEmailCounter = 0;
    }
  }

  createPurchaseOrderVend() {
    if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to send order to supplier');
    } else {
      if (this.emailModalData.sendEmail) {
        if (
          !Utils.validateEmail(this.emailModalData.to.split(',')) || !Utils.validateEmail(this.emailModalData.cc.split(',')) || !Utils.validateEmail(this.emailModalData.bcc.split(','))
        ) {
          this.toastr.error('Invalid Email');
          return;
        }
      }
      this.creatingPurchaseOrderVend = true;
      this.loading = true;
      this.toastr.info('Creating Purchase Order');
      this.orgModelApi.createPurchaseOrderVend(
        this.userProfile.orgModelId,
        this.order.id,
        this.emailModalData.sendEmail,
        {
          to: this.emailModalData.to ? this.emailModalData.to.split(',') : [],
          cc: this.emailModalData.cc ? this.emailModalData.cc.split(',') : [],
          bcc: this.emailModalData.bcc ? this.emailModalData.bcc.split(',') : []
        }
      ).subscribe(purchaseOrderRequest => {
        this.loading = false;
        if (this.emailModalData.sendEmail) {
          this.toastr.success('Sent email successfully');
        }
        this.toastr.info('Pushing purchase order to Vend');
        this._router.navigate(['/orders/stock-orders']);
      }, error1 => {
        this.creatingPurchaseOrderVend = false;
        this.loading = false;
        this.toastr.error('Error in sending order to supplier')
      });
    }
  }

  updateLineItems(lineItems, data: any) {
    // Approve All Button Click when no items are present
    if (data.approved && this.totalNotApprovedLineItems + this.totalApprovedLineItems === 0) {
      this.toastr.error('No Items to Approve');
      return
    }
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
          this.getApprovedStockOrderLineItems();
          this.getNotApprovedStockOrderLineItems();
        },
        err => {
          console.log('err', err);
          this.loading = false;
        });
  }

  approveItem(lineItem) {
    if (lineItem.orderQuantity > 0) {
      this.updateLineItems(lineItem, {
        approved: true,
        orderQuantity: lineItem.orderQuantity
      });
    }
    else {
      this.toastr.error('Quantity cannot be less than 1');
    }
  }

  removeItem(lineItem) {
    this.updateLineItems(lineItem, {approved: false});
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
            this.getNotApprovedStockOrderLineItems();
            this.getApprovedStockOrderLineItems();
          }
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Error updating order state, please refresh');
        });
  };

  downloadOrderCSV() {
    this.loading = true;
    this.orgModelApi.downloadReportModelCSV(this.userProfile.orgModelId, this.order.id).subscribe((data) => {
      const link = document.createElement('a');
      link.href = data;
      link.download = this.order.name;
      link.click();
      this.loading = false;
    }, err => {
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

  collapsed(event: any): void {
    // console.log(event);
  }

  expanded(event: any): void {
    // console.log(event);
  }

  setDesiredStockLevelForVend(lineItem) {
    this.loading = true;
    this.orgModelApi.setDesiredStockLevelForVend(
      this.userProfile.orgModelId,
      this.order.storeModelId,
      lineItem.productModelId,
      lineItem.desiredStockLevel)
      .subscribe((data: any) => {
          this.toastr.success('Updated desired stock level successfully');
          this.loading = false;
        },
        err => {
          this.toastr.error('Error updating desired stock level');
          this.loading = false;
          console.log(err);
        });
  }

  increaseDSL(lineItem) {
    lineItem.desiredStockLevel += 1;
    this.adjustOrderQuantityWithDSL(lineItem);
  }

  decreaseDSL(lineItem) {
    lineItem.desiredStockLevel -= 1;
    this.adjustOrderQuantityWithDSL(lineItem);
  }

  adjustOrderQuantityWithDSL(lineItem) {
    lineItem.orderQuantity = lineItem.desiredStockLevel - lineItem.storeInventory;
    if (lineItem.caseQuantity && (lineItem.orderQuantity % lineItem.caseQuantity) !== 0) {
      lineItem.orderQuantity = Math.ceil(lineItem.orderQuantity / lineItem.caseQuantity) * lineItem.caseQuantity;
    }
  }

  addProductToStockOrder(productModel: any) {
    if (!productModel.orderQuantity) {
      this.toastr.error('Order Quantity should be greater than zero');
      return;
    }
    this.orgModelApi.addProductToStockOrder(
      this.userProfile.orgModelId,
      this.order.id,
      this.order.storeModelId,
      productModel
    ).subscribe(result => {
      this.toastr.success('Added product to stock order');
    }, error => {
      this.toastr.error('Cannot add product to stock order');
    })
  }

  openDeleteModal() {
    this.bsModalRef = this.modalService.show(DeleteOrderComponent, {initialState: {orderId: this.order.id}});
  }

  keyUpEvent(event, searchSKUText) {
    if (event.keyCode == '13') {
      this.searchProductBySku(searchSKUText)
    }
  }

  changeGraphNumberOfDays(event, lineItem) {
    if (event.keyCode == '13') {
      this.fetchSalesHistory(lineItem)
    }
  }

  fetchSalesHistory(lineItem) {
    if (this.order.stockUpReorderPoints) {
      this.loadingGraph = true;
      //first decide no. of days to display in graph
      this.salesRangeDates = [];
      let millisecondsInDay = 24 * 60 * 60 * 1000;
      let orderCeatedAt:any = new Date(this.order.createdAt);
      for (let i = this.graphNumberOfDays - 1; i >= 0; i--) {
        let date = orderCeatedAt - (i * millisecondsInDay);
        this.salesRangeDates.push(new Date(date));
      }
      this.lineChartLabels = this.salesRangeDates.map(x => x.getUTCDate() + '/' + (x.getUTCMonth() + 1));

      //fetch data for the no. of days decided
      this.lineChartData[0].data.length = 0;
      let firstDateOfSaleInRange = new Date(orderCeatedAt - (this.graphNumberOfDays * millisecondsInDay));
      this.orgModelApi.getSalesLineItemsModels(this.userProfile.orgModelId, {
        where: {
          productModelId: lineItem.productModelId,
          salesDate: {
            gte: firstDateOfSaleInRange,
            lte: new Date(this.order.createdAt),
          },
          isReturnSale: 0,
          storeModelId: this.order.storeModelId
        },
        order: 'salesDate DESC',
      }).subscribe(result => {
          //if no sales data found for specified range, find the last-most sale
          if (!result.length) {
            this.orgModelApi.getSalesLineItemsModels(this.userProfile.orgModelId, {
              where: {
                productModelId: lineItem.productModelId,
                storeModelId: this.order.storeModelId,
                isReturnSale: 0
              },
              order: 'salesDate DESC',
              limit: 1
            })
              .subscribe(sale => {
                  if (sale.length) {
                    let salesDate = new Date(sale[0].salesDate);
                    let salesDateLabel = salesDate.getUTCDate() + '/' + (salesDate.getUTCMonth() + 1) + '/' + salesDate.getFullYear().toString().substr(-2);
                    //if dates displayed are more than normal, possibly because of last graph's
                    //last-most displayed sale, then replace that one with this, otherwise just add
                    //a new date label
                    if (this.lineChartLabels.length > this.graphNumberOfDays) {
                      this.lineChartLabels[0] = salesDateLabel;
                      this.salesRangeDates[0] = salesDate;
                    }
                    else {
                      this.lineChartLabels.unshift(salesDateLabel);
                      this.salesRangeDates.unshift(salesDate);
                    }
                    this.updateSalesGraph(sale);
                  }
                },
                err => {
                  console.log('error fetching sales data');
                  this.toastr.error('Error fetching sales data for ' + lineItem.productModelSku);
                });
          }
          else {
            this.updateSalesGraph(result);
          }
        },
        err => {
          console.log('error fetching sales data');
          this.toastr.error('Error fetching sales data for ' + lineItem.productModelSku);
        });
    }
  }

  updateSalesGraph(sales) {
    let perDateSales = [];
    this.loadingGraph = false;
    this.salesRangeDates.map((eachDate, index) => {
      let totalQuantities = 0;
      sales.map((eachSale) => {
        if (this.compareDateOfSales(eachDate, new Date(eachSale.salesDate))) {
          totalQuantities += eachSale.quantity;
        }
      });
      perDateSales.push(totalQuantities);
    });
    this.lineChartData[0].data = perDateSales;
    //timeout because updating chart data and updating the chart shouldn't be async
    setTimeout(()=> {
      this.chart.update({
        duration: 800,
        easing: 'easeOutBounce'
      });
    }, 100);
  }

  compareDateOfSales(date1, date2) {
    if (date1.getDate() === date2.getDate()
      && date1.getMonth() === date2.getMonth()
      && date1.getFullYear() === date2.getFullYear()) {
      return true;
    }
    return false;
  }

  public chartClicked(e: any): void {
    console.log(e);
  }

  public chartHovered(e: any): void {
    console.log(e);
  }

  decrementQuantity(lineItem: any) {
    let newOrderQty = lineItem.orderQuantity - (lineItem.caseQuantity || 1);
    if (newOrderQty < 0) {
      newOrderQty = 0;
    }
    lineItem.orderQuantity = newOrderQty
  }

  listenItemSyncChanges() {
    const EventSourceUrl = `/notification/${this.order.id}-line-items/waitForResponseAPI`;
    const eventApi = this._eventSourceService.connectToStream(EventSourceUrl)
        .subscribe(([event, es]) => {
          console.log(event);
          const { data } = event;
          const searchArray = data.approved ? this.approvedLineItems: this.notApprovedLineItems;
          for (let i = 0; i < searchArray.length; i++){
            if (searchArray[i].id === data.stockOrderLineItemId) {
              searchArray[i].asyncPushSuccess = data.success;
              this.changeDetector.detectChanges();
              break;
            }
          }

        });
    this.subscriptions.push(eventApi);
  }
}
