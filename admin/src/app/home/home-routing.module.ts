import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {SyncWithVendComponent} from './sync-with-vend/sync-with-vend.component';
import {StoresComponent} from './stores/stores.component';
import {PaymentsComponent} from './payments/payments.component';
import {ProductsComponent} from './products/products.component';
import {UserResolverService} from './../shared/services/user-resolver.service';
import {AccessService} from "../shared/services/access.service";
import {SyncWithVendResolverService} from "./sync-with-vend/services/sync-with-vend-resolver.service";

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: '',
        redirectTo: 'stores',
        pathMatch: 'full'
      },
      {
        path: 'sync-with-vend',
        component: SyncWithVendComponent,
        data: {
          title: 'Home > Stores'
        },
        resolve: {
          syncModels: SyncWithVendResolverService
        }
      },
      {
        path: 'stores',
        component: StoresComponent,
        data: {
          title: 'Home > Stores'
        }
      },
      {
        path: 'payments',
        component: PaymentsComponent,
        data: {
          title: 'Home > Payments'
        }
      },
      {
        path: 'products',
        component: ProductsComponent,
        data: {
          title: 'Home > Products'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers:[SyncWithVendResolverService]
})
export class HomeRoutingModule {
}
