import { LightningElement ,api, wire, track} from 'lwc';
import getProducts from '@salesforce/apex/OrderManagementController.getProducts';
import getOrderAndProducts from '@salesforce/apex/OrderManagementController.getOrderAndProducts';
import updateOrderItems from '@salesforce/apex/OrderManagementController.updateOrderItems';
import { NavigationMixin } from 'lightning/navigation';



export default class EditOrder extends NavigationMixin(LightningElement) {
    @api record;
    @api newOrderSummary;
    
    modeToggle=true;editModeToggle=false;
    tableToggle=true;addItemToggle=false;
    
    showSearchList=false;
    searchProductList;priceBookId;
    order;productList=[];toDeleteList=[];
    
    connectedCallback(){
        getOrderAndProducts({orderId:this.record})
        .then(result=>{
            this.order=result[0];
            this.priceBookId=this.order.Pricebook2Id;
            for(var product of this.order.OrderItems){
                var selectedproduct=new Object();
                selectedproduct.OrderItemId=product.Id;
                selectedproduct.PricebookEntryId=product.PricebookEntryId;
                selectedproduct.ProductId=product.PricebookEntry.Product2Id;
                selectedproduct.Name=product.PricebookEntry.Product2.Name;
                selectedproduct.ProductCode=product.PricebookEntry.Product2.ProductCode;
                selectedproduct.Brand=product.PricebookEntry.Product2.Brand__c;
                selectedproduct.Stock_Quantity=product.PricebookEntry.Product2.Stock_Quantity__c;
                selectedproduct.Quantity=product.Quantity;
                selectedproduct.Discount=product.Discount__c;
                selectedproduct.ListPrice=product.ListPrice;
                selectedproduct.UnitPrice=product.UnitPrice;
                this.productList.push(selectedproduct);
            }
        });
    }
    editModeEnable(){
        this.modeToggle=false;
    }
    addItemClicked(){
        this.addItemToggle=true;
    }
    closeModal(){
        this.addItemToggle=false;
    }
    handleSearch(event){
        if(event.target.value.length!=0){
            getProducts({priceBookId:this.priceBookId,searchVal:event.target.value})
            .then(result=>{
                this.searchProductList=result;
            });
            this.showSearchList=true;
        }
        if(event.target.value.length==0){
            this.showSearchList=false;
        }
    }
    addNewProduct(event){
        var newProduct=event.target.value;
        var selectedproduct=new Object();
        for(var product of this.searchProductList){
            if(newProduct.Id == product.Id){
                selectedproduct.Product2Id=product.Product2Id;
                selectedproduct.Name=product.Product2.Name;
                selectedproduct.ProductCode=product.Product2.ProductCode;
                selectedproduct.Brand=product.Product2.Brand__c;
                selectedproduct.Stock_Quantity=product.Product2.Stock_Quantity__c;
                selectedproduct.Quantity=1;
                selectedproduct.UnitPrice=0;
                selectedproduct.ListPrice=product.UnitPrice;
                selectedproduct.Discount=0;
                selectedproduct.PriceBookEntryId=product.Id;
                break;
            }
        }
        if(!this.productList.some(item => item.ProductCode === selectedproduct.ProductCode)){
            this.productList.push(selectedproduct);
        }
        this.closeModal();
    }
    deleteFromSummaryClicked(event){
        var index = -1;
        for(var product of this.productList){
            index++;
            if(event.target.name==product.ProductCode){
                break;
            }
        }
        if(this.productList[index].OrderItemId != undefined){
            this.toDeleteList.push(this.productList[index]);
        }
        console.log(this.toDeleteList);
        this.productList.splice(index,1);
        this.tableToggle=false;
        this.tableToggle=true;
    }
    updateQuantity(event){
        if (event.target.value > event.target.name.Stock_Quantity) {
            event.target.setCustomValidity("Enter a valid Quantity");
        } else {
            event.target.setCustomValidity("");
        }
        var index = -1;
        for(var product of this.productList){
            index++;
            if(event.target.name.ProductCode == product.ProductCode){
                break;
            }
        }
        this.productList[index].Quantity=event.target.value;
        event.target.reportValidity();
    }
    updateDiscount(event){
        var index = -1;
        for(var product of this.productList){
            index++;
            if(event.target.name.ProductCode == product.ProductCode){
                break;
            }
        }
        this.productList[index].Discount=event.target.value;
    }
    saveClicked(){
        for(var product of this.productList){
            product.UnitPrice=product.ListPrice - (product.ListPrice * product.Discount / 100);
        }
        updateOrderItems({products:JSON.stringify(this.productList),toDeleteList:JSON.stringify(this.toDeleteList),orderId:this.record})
        .then(result=>{if(!this.newOrderSummary){eval("$A.get('e.force:refreshView').fire();");}else{this.modeToggle=true;}})
        .catch(error=>{alert('Error : Cannot Add Or Remove Products from Activated Orders!' )});
    }
    cancelEditClicked(){
        if(!this.newOrderSummary){
            eval("$A.get('e.force:refreshView').fire();");
        }else{
            this.modeToggle=true;
        }
    }
}