import { LightningElement, wire, track } from 'lwc';
import getPriceBooks from '@salesforce/apex/OrderManagementController.getPriceBooks';
import getAccounts from '@salesforce/apex/OrderManagementController.getAccounts';
import getProducts from '@salesforce/apex/OrderManagementController.getProducts';
import createOrder from '@salesforce/apex/OrderManagementController.createOrder';
import changeOrderStatus from '@salesforce/apex/OrderManagementController.changeOrderStatus';
import { NavigationMixin } from 'lightning/navigation';

export default class CreateOrder extends NavigationMixin(LightningElement) {

    @wire(getAccounts) accList;
    @wire(getPriceBooks) priceBookList;
    @track orderId;
    @track newOrderSummary=true;

    modalToggle=false;modalHeader;error;
    lookUpAccountsToggle=false;selectedAccountId;accountInputField;accountInputFieldDisabled=false;
    lookUpPriceBooksToggle=false;selectedPriceBookId;priceBookInputField;priceBookInputFieldDisabled=false;

    searchProductList;searchProductTableToggle=false;
    selectedProductList=[];selectedTableToggle=false;

    orderSummaryToggle=false;

    closeModal(){
        this.lookUpPriceBooksToggle=false;
        this.lookUpAccountsToggle=false;
        this.modalToggle=false;
    }
    lookUpAccounts(event){
        this.accountInputField=event.target;
        this.modalHeader='Select Account';
        this.lookUpAccountsToggle=true;
        this.modalToggle=true;
    }
    accountSelected(event){
        this.accountInputField.value=event.target.name;
        this.selectedAccountId=event.target.value;
        this.closeModal();
        this.accountInputFieldDisabled=true;
    }
    lookUpPriceBooks(event){
        this.priceBookInputField=event.target;
        this.modalHeader='Select Price Book';
        this.lookUpPriceBooksToggle=true;
        this.modalToggle=true;
    }
    priceBookSelected(event){
        this.priceBookInputField.value=event.target.name;
        this.selectedPriceBookId=event.target.value;
        this.closeModal();
        this.priceBookInputFieldDisabled=true;
    }
    handleSearch(event){
        if(event.target.value != ''){
            getProducts({priceBookId:this.selectedPriceBookId,searchVal:event.target.value})
            .then(result=>{this.searchProductList=result});
            this.searchProductTableToggle=true;
        }
        else{
            this.searchProductTableToggle=false;
        }
    }
    hideSearchTable(){
        this.searchProductTableToggle=false;
    }
    addProduct(event){
        this.searchProductTableToggle=false;
        var product=event.target.value;
        var selectedproduct=new Object();
        selectedproduct.PriceBookEntryId=product.Id;
        selectedproduct.ProductId=product.Product2Id;
        selectedproduct.Name=product.Product2.Name;
        selectedproduct.ProductCode=product.Product2.ProductCode;
        selectedproduct.Brand=product.Product2.Brand__c;
        selectedproduct.Stock_Quantity=product.Product2.Stock_Quantity__c;
        selectedproduct.Quantity=1;
        selectedproduct.UnitPrice=0;
        selectedproduct.ListPrice=product.UnitPrice;
        selectedproduct.Discount=0;
        this.selectedProductList.push(selectedproduct);
        this.selectedTableToggle=true;
    }
    updateQuantity(event){
        if (event.target.value > event.target.name.Stock_Quantity) {
            event.target.setCustomValidity("Enter a valid Quantity");
        } else {
            event.target.setCustomValidity("");
        }
        var index = -1;
        for(var product of this.selectedProductList){
            index++;
            if(event.target.name.ProductCode == product.ProductCode){
                break;
            }
        }
        this.selectedProductList[index].Quantity=event.target.value;
        event.target.reportValidity();
    }
    updateDiscount(event){
        var index = -1;
        for(var product of this.selectedProductList){
            index++;
            if(event.target.name.ProductCode == product.ProductCode){
                break;
            }
        }
        this.selectedProductList[index].Discount=event.target.value;
    }
    removeClicked(event){
        var index = -1;
        for(var product of this.selectedProductList){
            index++;
            if(event.target.value.ProductCode == product.ProductCode){
                break;
            }
        }
        this.selectedProductList.splice(index,1);
        this.selectedTableToggle=false;
        this.selectedTableToggle=true;
    }
    saveClicked(){
        this.error=false;
        for(var product of this.selectedProductList){
            if(product.Quantity > product.Stock_Quantity){
                this.error=true;
                break;
            }
        }
        if(this.selectedAccountId==undefined){
            this.error=true;
        }
        if(!this.error){
            this.selectedTableToggle=false;
            for(var product of this.selectedProductList){
                var selectedproduct=new Object();
                if(product.Quantity>10){
                    selectedproduct.PriceBookEntryId=product.PriceBookEntryId;
                    selectedproduct.ProductId=product.ProductId;
                    selectedproduct.Name=product.Name;
                    selectedproduct.ProductCode=product.ProductCode;
                    selectedproduct.Brand=product.Brand;
                    selectedproduct.Stock_Quantity=product.Stock_Quantity;
                    selectedproduct.Quantity=1;
                    selectedproduct.UnitPrice=0;
                    selectedproduct.ListPrice=product.ListPrice;
                    selectedproduct.Discount=100;
                    this.selectedProductList.push(selectedproduct);
                }
            }
            for(var product of this.selectedProductList){
                product.UnitPrice=product.ListPrice - (product.ListPrice * product.Discount / 100);
            }
            createOrder({selectedProducts:JSON.stringify(this.selectedProductList),priceBookId:this.selectedPriceBookId,selectedAccountId:this.selectedAccountId})
            .then(result=>{
                this.orderId=result;
                this.modalHeader='Order Summary';
                this.orderSummaryToggle=true;
                this.modalToggle=true;
            });
        }
    }
    clearSearchClicked(){
        eval("$A.get('e.force:refreshView').fire();");
    }
    confirmOrderClicked(){
        changeOrderStatus({orderId:this.orderId,status:'Created'})
        .then(result=>{this.navigateToListView()});
    }
    cancelOrderClicked(){
        changeOrderStatus({orderId:this.orderId,status:'Cancelled'})
        .then(result=>{this.navigateToListView()});
    }
    navigateToListView() {
        // Navigate to the Contact object's Recent list view.
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: 'Order',
                actionName: 'list'
            },
            state: {
                filterName: 'Recent'
            }
        });
    }
}