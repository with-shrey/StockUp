import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {UserProfileService} from './services/user-profile.service';
import {AccessService} from './services/access.service';
import {UserResolverService} from './services/user-resolver.service';
import {TypeaheadModule, BsDropdownModule} from 'ngx-bootstrap';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import {AppAsideModule} from '@coreui/angular';
import {FileUploadModule} from 'ng2-file-upload';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {PopoverModule} from 'ngx-bootstrap/popover';
import {PaginationModule} from 'ngx-bootstrap/pagination';
import {ModalModule} from 'ngx-bootstrap/modal';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {AutoFocusDirective} from '../home/products/bin-locations/directives/auto-focus.directive';
import { DebounceKeyUpDirective } from './directives/debounce-key-up/debounce-key-up.directive';
import {CommentsComponent} from "../home/orders/stock-orders/comments/comments.component";

@NgModule({
  imports: [
    AppAsideModule,
    BsDropdownModule,
    CommonModule,
    FormsModule,
    LoadingModule,
    FileUploadModule,
    TypeaheadModule,
    CollapseModule,
    FileUploadModule,
    PaginationModule,
    PopoverModule.forRoot(),
    TabsModule,
    ModalModule.forRoot()
  ],
  declarations: [AutoFocusDirective, DebounceKeyUpDirective, CommentsComponent],
  exports: [
    FormsModule,
    BsDropdownModule,
    TypeaheadModule,
    LoadingModule,
    CommentsComponent,
    AppAsideModule,
    CollapseModule,
    CommonModule,
    FileUploadModule,
    TypeaheadModule,
    PaginationModule,
    PopoverModule,
    TabsModule,
    AutoFocusDirective,
    DebounceKeyUpDirective,
    ModalModule
  ]
})

export class SharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [UserProfileService, AccessService, UserResolverService]
    };
  }
}

