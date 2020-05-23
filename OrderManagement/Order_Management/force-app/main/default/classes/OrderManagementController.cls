public with sharing class OrderManagementController {

    class ProductDetail{
        public String OrderItemId;
        public String PricebookEntryId;
        public String ProductId;
        public String Discount;
        public String Quantity;
        public String UnitPrice;
    }
    @AuraEnabled(cacheable=true)
    public static list<Pricebook2> getPriceBooks(){
        return [select Id,Name from Pricebook2];
    }
    @AuraEnabled(cacheable=true)
    public static list<Account> getAccounts(){
        return [select Id,Name from Account];
    }
    @AuraEnabled
    public static list<PriceBookEntry> getProducts(String priceBookId,String searchVal){
        return [select Id,Product2.Id,Product2.Name,Product2.ProductCode,Product2.Brand__c,Product2.Stock_Quantity__c,UnitPrice from PriceBookEntry where Pricebook2Id=:priceBookId AND Product2.Name LIKE :'%'+searchVal+'%'];
    }
    @AuraEnabled
    public static String createOrder(String selectedProducts,String priceBookId,String selectedAccountId){
        list<ProductDetail> productList=new list<ProductDetail>();
        JSONParser parser = JSON.createParser(selectedProducts);
        while (parser.nextToken() != null) {
            if (parser.getCurrentToken() == JSONToken.START_ARRAY) {
                while (parser.nextToken() != null) {
                    if (parser.getCurrentToken() == JSONToken.START_OBJECT) {
                        ProductDetail acc = (ProductDetail)parser.readValueAs(ProductDetail.class);
                        productList.add(acc);
                    }
                }
            }
        }
        Order order=new Order(AccountId=selectedAccountId,EffectiveDate=date.today(),Status='Saved',Pricebook2Id=priceBookId);
        insert order;
        list<OrderItem> orderItemList = new list<OrderItem>();
        for(ProductDetail product:productList){
            orderItemList.add(new OrderItem(OrderId=order.Id,Product2Id=product.ProductId,Quantity=Decimal.valueOf(product.Quantity),UnitPrice=Decimal.valueOf(product.UnitPrice),PricebookEntryId=product.PriceBookEntryId,Discount__c=Integer.valueOf(product.Discount)));
        }
        system.debug(orderItemList);
        insert orderItemList;
        return order.Id;
    }
    @AuraEnabled
    public static String changeOrderStatus(String orderId,String status){
        Order order=new Order(Id=orderId,Status=status);
        update order;
        return '';
    }
    @AuraEnabled
    public static list<Order> getOrderAndProducts(String orderId){
        return [select Id,PriceBook2.Id,OrderNumber,TotalAmount,Account.Name,(select Id,PriceBookEntryId,PriceBookEntry.Product2Id,PriceBookEntry.Product2.Name,PriceBookEntry.Product2.ProductCode,PriceBookEntry.Product2.Brand__c,PriceBookEntry.Product2.Stock_Quantity__c,UnitPrice,ListPrice,Quantity,Discount__c from OrderItems) from Order where Id =:orderId];
    }
    @AuraEnabled
    public static String updateOrderItems(String products, String toDeleteList, String orderId){
        list<ProductDetail> productList=new list<ProductDetail>();
        JSONParser parser = JSON.createParser(products);
        while (parser.nextToken() != null) {
            if (parser.getCurrentToken() == JSONToken.START_ARRAY) {
                while (parser.nextToken() != null) {
                    if (parser.getCurrentToken() == JSONToken.START_OBJECT) {
                        ProductDetail acc = (ProductDetail)parser.readValueAs(ProductDetail.class);
                        productList.add(acc);
                    }
                }
            }
        }
        list<OrderItem> orderItemList = new list<OrderItem>();
        for(ProductDetail product:productList){
            if(product.OrderItemId==null){
                orderItemList.add(new OrderItem(OrderId=orderId,Product2Id=product.ProductId,Quantity=Decimal.valueOf(product.Quantity),UnitPrice=Decimal.valueOf(product.UnitPrice),PricebookEntryId=product.PriceBookEntryId,Discount__c=Integer.valueOf(product.Discount)));
            }
            else{
                orderItemList.add(new OrderItem(Id=product.OrderItemId,Product2Id=product.ProductId,Discount__c=Decimal.valueOf(product.Discount),Quantity=Decimal.valueOf(product.Quantity),UnitPrice=Decimal.valueOf(product.UnitPrice)));
            }
        }
        upsert orderItemList;
        productList=new list<ProductDetail>();
        parser = JSON.createParser(toDeleteList);
        while (parser.nextToken() != null) {
            if (parser.getCurrentToken() == JSONToken.START_ARRAY) {
                while (parser.nextToken() != null) {
                    if (parser.getCurrentToken() == JSONToken.START_OBJECT) {
                        ProductDetail acc = (ProductDetail)parser.readValueAs(ProductDetail.class);
                        productList.add(acc);
                    }
                }
            }
        }
        orderItemList = new list<OrderItem>();
        for(ProductDetail product:productList){
            orderItemList.add(new OrderItem(Id=product.OrderItemId));
        }
        delete orderItemList;
        return '';
    }
}
