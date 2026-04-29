# Chapter 5 Goods Receipt


<!-- Page 252 -->

253
Chapter 5
Goods Receipt
After an inventory plan has been made and adjusted, inventory 
execution begins. This chapter gives step-by-step instructions for per-
forming the first of several execution processes (goods receipt) in SAP 
S/4HANA.
This chapter focuses on the material inward flow in different process facets of a goods 
receipt. We’ll spotlight the different flavors of a goods receipt and focus on SAP S/4HANA 
and SAP Fiori specialties.
The following SAP Fiori apps are discussed in this chapter:
▪Goods Receipt for Purchase Order (F0843)
▪Goods Receipt for Inbound Delivery (F2502)
▪Goods Receipt for Production Order (F3110)/Post Goods Receipt for Process Order 
(F6352)
▪Goods Receipt without Reference (F3244)
▪Post Subsequent Adjustment (F5476)
As of now, not all process variants that were supported by SAP ERP are also supported 
via an SAP Fiori-based app (we’ll cover this in Section 5.7). In the meantime, the web-
based SAP GUI Post Goods Movement app (formerly known as Transaction MIGO) pro-
vides all process variants for goods receipts.
We’ll begin with a walk-through of SAP Fiori apps for key goods receipt processes: the 
purchase order, inbound delivery, and production order. We’ll then outline some real-
world scenarios and best practices, discuss the goods receipt without reference sce-
nario, and look at what’s ahead.
5.1    Purchase Order
One important step in a company’s procurement process is the receipt of procured or 
produced goods. At receipt, these new goods are physically taken over in the company’s 
owned stock and can be treated accordingly, depending on follow-up activities such as 
quality inspection. These goods receipt processes can have different flavors, which are 
outlined in the following sections in more detail.


<!-- Page 253 -->

5 Goods Receipt
254
5.1.1    Purchase Orders for Inventory
The goods receipt process that is based on a given purchase can be performed in SAP 
Fiori via the Post Goods Receipt for Purchasing Document app. To enable end users to 
use this app via the SAP Fiori launchpad, special business roles must be assigned. SAP 
delivers certain standard business roles as templates (see Chapter 3, Section 3.6.2, for 
assigning roles). In this case, the business roles SAP_BR_INVENTORY_MANAGER and 
SAP_BR_WAREHOUSE_CLERK include the target mapping of the Post Goods Receipt for 
Purchase Order app.
After the end user is assigned to the related target mapping, the SAP Fiori launchpad
provides the related tile, as shown in Figure 5.1.
Figure 5.1  SAP Fiori Launchpad Tile: Post Goods Receipt for Purchasing Document
The Post Goods Receipt for Purchasing Document app can post goods receipts for stock-
related procurement and for materials procured for direct consumption.
Click the Post Goods Receipt for Purchasing Document tile, and then select the required 
purchase order on the next screen. There are different ways of selecting the right pur-
chase order:
▪Entering the related purchase order manually
▪Copying and pasting a given purchase order from the clipboard
▪Selecting the purchase order via search help (F4)
▪Scanning a barcode
Figure 5.2 illustrates the type-ahead search if you enter a purchase order number. In this 
case, the app tries to identify the purchase order after four digits are entered and pro-
vides the search results based on a “contains search” in a dropdown list while you’re still 
entering the purchase order.


<!-- Page 254 -->

255
5.1 Purchase Order
Figure 5.2  Entering the Purchase Order Number
Along with the purchase order number, the supplier name can also be used as a search 
term. In this case, three letters (case-insensitive) are enough for the app to start using 
the type-ahead search.
The functionality of the app can be adjusted to your needs via the Application Settings
in your Me Area. Figure 5.3 and Figure 5.4 depict how to access the settings and which 
settings can be performed.
First, you click the user icon in the upper-right corner to open the screen shown in 
Figure 5.3. In the screen that appears, you click Application Settings to open the screen 
shown in Figure 5.4 for adjusting the application-related settings.
The app setting for printing can be modified, and you can also enable printing with the 
related slip. The barcode scanning settings can be checked via a separate entry as part 
of the Me Area (in the Scanner Settings; for details, see Section 5.7.3). Barcode scanning
is one of the more innovative features of SAP Fiori. Each end user can set their applica-
tion settings independently.
Figure 5.3  Application Settings


<!-- Page 255 -->

5 Goods Receipt
256
Figure 5.4  Details of Application Settings
After the application settings are done and a certain purchase order has been selected, 
the application loads and displays the related purchase order data in the header at the 
top of the screen. In Figure 5.5, the purchase order number in the header is blue because 
the SAP Fiori launchpad provides an intent-based navigation to the purchase order 
object page if the end user owns the related target mapping authorizations.
Figure 5.5  Purchase Order Header Data
The only mandatory fields in the header data are the Document Date and Posting Date, 
which are already prefilled by the app but can be changed by the end user.
Below the header data, the purchase order items are listed in a table view. Our example 
in Figure 5.6 shows that the Post Goods Receipt for Purchasing Document app only out-
lines purchase order items that can be successfully processed within this application 
(material test in plant 6010). The purchase order items are automatically loaded and 
displayed when the purchase order itself is selected.
Figure 5.6  Purchase Order Item Data


<!-- Page 256 -->

257
5.1 Purchase Order
If a purchase order item meets one of the following criteria, it won’t be outlined by the 
app and won’t be shown in the item list table of the app:
▪An unsupported account assignment is chosen.
▪The Delivery Completed indicator is set.
The account assignment category is part of the purchase order item. Table 5.1 shows 
which account assignment categories are supported. Purchase order items having one 
of these account assignment categories assigned can be processed with the app and will 
be shown in the item table of the app.
Via the notification icon in the lower left-hand corner (not shown), you’re informed via 
an information message if a purchase order item is filtered out.
For purchase order items that can’t be processed with this SAP Fiori app, the web-based 
SAP GUI Post Goods Movement app might be used instead.
5.1.2    Stock-Related Procurement
In the examples in this section, we’ll focus on procurement for stock.
For stock-related procurement, each purchase order item is assigned to a stock type 
during goods receipt. A stock type can be selected that might reflect a different move-
ment type when the material document is created, according to Table 5.2.
Account Assignment Category
Description
A
Asset
C
Sales order
F
Order
K
Cost center
M
Individual customer requirements without KD-CO
P
Project
Q
Project make to order
R
Service order
S
Third party
X
All auxiliary account assignments
Table 5.1  Supported Account Assignment Categories


<!-- Page 257 -->

5 Goods Receipt
258
Depending on the purchase order, it’s possible to post different material movements. 
For movement types 103 and 105, separate material documents are posted for each; for 
movement types 101 and 161, only one material document is posted covering both types 
(see Chapter 3, Section 3.1.3). Figure 5.7 shows the dropdown list of possible stock types 
you could select per purchase order item. The previously mentioned movement types 
reflect certain stock types (refer to Table 5.2).
Figure 5.7  Different Stock Types
A split of purchase order items, that is, to post one purchase order item to different 
stock types or storage locations, is possible by clicking the + icon in the Distribution col-
umn (see Figure 5.8).
The table view of the purchase order items provides a personalization functionality that 
can be accessed by clicking the gear icon on the upper-left side of the purchase order item 
table (see Figure 5.9). To enable the open quantity to be presented to the end user for pre-
assignment, you choose the Use open quantity option. To do the same for the purchase 
order item short text if the related purchase order item is without a reference to a material 
with a material master record, you choose the Use from Purchasing Document option.
In addition, by clicking the Table View icon, you can select from a broad range of col-
umns to be displayed or hidden in the app. As depicted in Figure 5.10, you can also click 
Reset in the upper-right corner to return the settings to default.
Stock Type
Movement Type
Unrestricted use
101
Quality inspection
101
Blocked
101
Nonvaluated goods receipt blocked stock
103
Release of nonvaluated goods receipt blocked stock
105
Posting of return items
161
Goods issue subcontracting stock
543
Receipt subcontracting by-product
545
Table 5.2  Supported Stock Types


<!-- Page 258 -->

259
5.1 Purchase Order
Figure 5.8  Purchase Order Item List in Table View
Figure 5.9  Personalization Options
Figure 5.10  Steering of Columns in Goods Receipt App


<!-- Page 259 -->

5 Goods Receipt
260
The Storage Location search help offers an implicit view of the current stock situation 
based on a micro chart, as shown in Figure 5.11. The micro chart depicts the stock level 
of the three support stock types (refer to Table 5.2). The goods receipt blocked stock isn’t 
part of the company’s owned stock and therefore isn’t outlined here.
All storage locations that are already assigned in the related material master data view 
(database table MARD) are listed in the Standard area of the search help. Plant storage loca-
tions that aren’t yet assigned in the material master are listed in the Derived area if the 
related setting is activated for the related movement type in the Customizing activity 
Create Storage Location Automatically (see Chapter 3, Section 3.1.3). If this setting is 
given, and the goods receipt is posted, the system automatically creates the assignment 
between the material master record and storage location.
Figure 5.11  Storage Location Search Help with Stock Data
By clicking a purchase order item (as shown earlier in Figure 5.8), an information page 
is displayed outlining the details for each item, such as the Ordered quantity or the 
Delivery Completed indicator (see Figure 5.12).
Additionally, the purchase order item screen offers a Plant Options tab, where you can 
set the Plant or change the Storage Location or the Stock Type the end user wants to put 
the goods in.


<!-- Page 260 -->

261
5.2 Inbound Delivery
Figure 5.12  Detail Screen of a Purchase Order Item
In the Additional Information tab, you can enter information like unloading point, 
goods recipient, or just a short text for each item.
5.2    Inbound Delivery
In this section, we’ll focus on goods receipts based on inbound deliveries. An inbound 
delivery combines and maintains all relevant data about the delivery process, which 
starts with the goods receipt, to serve the logistic process integration (i.e., in combina-
tion with warehouses).
The Post Goods Receipt for Inbound Delivery app in SAP Fiori is part of the business role 
template SAP_BR_RECEIVING_SPECIALIST. To get started, click the Post Goods Receipt 
for Inbound Delivery tile shown in Figure 5.13.
Figure 5.13  SAP Fiori Launchpad Tile: Post Goods Receipt for Inbound Delivery


<!-- Page 261 -->

5 Goods Receipt
262
Now, you have to enter or search for an Inbound Delivery, as depicted in Figure 5.14.
Figure 5.14  Selection of Inbound Delivery in Type-Ahead Search
After you’ve entered the related inbound delivery, the SAP Fiori app displays all items of 
the inbound delivery. You can enter goods receipt information such as delivered quan-
tity just as for a standard purchase order, which was described in the previous section.
5.3    Production Order
Along with goods being procured externally, companies might also produce their own 
goods. After production is finished, the produced goods have to enter the inventory by 
performing a related goods receipt, which we’ll describe in this section.
The Post Goods Receipt for Production Order app in SAP Fiori is also part of the business 
role template SAP_BR_WAREHOUSE_CLERK.
After starting the SAP Fiori app by clicking the SAP Fiori launchpad tile Post Goods 
Receipt for Production Order, you have to enter a Purchasing Document for which the 
goods receipt shall be performed, as shown in Figure 5.15.
Figure 5.15  Input of Production Order
Once the production order is selected, the SAP Fiori app displays the related header and 
item information, as shown in Figure 5.16.
Figure 5.16  Production Order Header Data


<!-- Page 262 -->

263
5.4 Goods Receipt without Reference
In the header section of the screen, the production order details are displayed, including 
a semantic object-based navigation capability to navigate to the production order object 
page (the Production Order link 1000000 in the header section of Figure 5.16).
Generally, the goods receipt process steps look very similar to a standard purchase 
order. After selecting the related production order, you have to enter the Delivered
quantity, Storage Location, and Stock Type information, as shown in Figure 5.17. Data 
that is already maintained in the production order is prefilled automatically by the app.
Figure 5.17  Production Order Item Data
Once the storage location is entered, you can click the Post button (located in the 
bottom-right corner of the screen, not shown in Figure 5.16) to perform the goods 
receipt accordingly. When the goods receipt is performed successfully, a material doc-
ument is created and the app shows a Success popup that provides a link to the material 
document that was created, as shown in Figure 5.18.
Figure 5.18  Successful Goods Receipt for Production Order
 
Note
In addition to the Post Goods Receipt for Production Order app, the Post Goods Receipt 
for Process Order app (F6352) is available with a very similar look and feel to process 
goods receipts with regard to a reference document process order.
5.4    Goods Receipt without Reference
Sometimes, there is no reference document or document number available (e.g., no 
purchase order number can be found), but the related goods have arrived and have to 
be put into the inventory to go ahead with dependent inventory management pro-
cesses. In this case, a goods receipt without a reference might be posted, as described in 
this section.


<!-- Page 263 -->

5 Goods Receipt
264
The Post Goods Receipt without Reference app in SAP Fiori is part of the business role 
template SAP_BR_WAREHOUSE_CLERK. After you start the related SAP Fiori app by 
clicking the Post Goods Receipt without Reference tile, the main screen of the app opens 
and provides the required input fields (see Figure 5.19). No item information can be pro-
vided because no reference document is given, so you have to enter the required data 
manually (at least the material, quantity, plant, storage location, and stock type).
Figure 5.19  Type-Ahead Search for Material
Depending on the selected stock type per item, the movement types used for posting 
the goods receipt are shown in Table 5.3.
By clicking the item, the detailed screen can be accessed as mentioned previously for 
different goods receipt apps (see Figure 5.20).
Figure 5.20  Item’s Detail Screen
Stock Type
Movement Type
Unrestricted use
501
Quality inspection
503
Blocked stock
505
Table 5.3  Movement Types Used in Goods Receipt without Reference


<!-- Page 264 -->

265
5.6 Process Variants
5.5    Post Subsequent Adjustment
There’s also an app for the adjustment of component quantities, which may be con-
sumed by subcontractors. In case of overconsumption or underconsumption, the Post 
Subsequent Adjustment app (F5476) can be used to correct these deviating consump-
tions accordingly.
The reference document needs to be a subcontracting purchase order, and the goods 
receipt needs to be posted against this purchasing document before a subsequent 
adjustment can be posted. Once you select the related purchase order, you can select 
the kind of adjustment in the detail screen of each item. In our example in Figure 5.21, 
the item contains two components for which an overconsumption (component RM13) 
and an underconsumption (RM14) shall be posted. The kind of adjustment can be 
selected in the dropdown list in the Goods Movement column.
Figure 5.21  Item Details Screen with Component Consumption Quantity Adjustment
The Post Subsequent Adjustment app utilizes the following movement types for post-
ing of related material documents:
▪121 (header material)
▪543 (overconsumption)
▪544 (underconsumption)
▪545 (excess receipt (for by-products))
▪546 (short receipt (for by-products))
Note that movement types 543, 544, 545, and 546 are dependent on the goods move-
ment selection in the item detail screen on the component level.
5.6    Process Variants
Now that we’ve discussed the different sources of goods receipts (purchase orders, pro-
duction orders, etc.), we’ll outline some variants of goods receipts that hold true for all 
goods receipt sources. Variants refer to the different possible shapes of materials in a 
goods receipt item. Let’s start with batch-managed materials.


<!-- Page 265 -->

5 Goods Receipt
266
5.6.1    Batch-Managed Materials
All the previously mentioned SAP Fiori apps can process batch-managed materials. If the 
Customizing of the related movement type is set accordingly in the Set Expiration Date 
Check IMG activity (see Chapter 3, Section 3.1.3), a shelf life and/or production date can 
also be entered per purchase order item, which is based on a batch-managed material.
Figure 5.22 shows a purchase order item that is batch managed (last entry shown). In this 
case, the apps dynamically display an additional Batch column to show the batch input 
field. In this field, you can select the required batch to which the material will be posted.
Figure 5.22  Batch-Managed Purchase Order Item
For enabled items, click the search icon in the Batch column field to open the screen 
shown in Figure 5.23. This search help window for selecting the batch contains stock 
information for the three main stock types as shown in Figure 5.23. Here you can select 
the required batch by clicking a list entry. The selected batch is taken over, and the 
search help window is closed automatically.
Figure 5.23  Stock Information of a Batch
In addition, you can click the purchase order item to access the detail screen that con-
tains the batch information, as shown in Figure 5.24.
If the Customizing setting Set Expiration Date Check (see Chapter 3, Section 3.1.3) is acti-
vated for the chosen movement type (chosen via the Stock Type dropdown list), a shelf-
life expiration date or a production date of the material has to be entered during goods 
receipt processing that is dependent on the material master record. In case these pre-
conditions are met, two additional fields will be shown on item level: Production Date
and Shelf Life Expiration Date.


<!-- Page 266 -->

267
5.6 Process Variants
Figure 5.24  Purchase Order Item Detail Screen with Batch Information
If a minimum remaining shelf life is entered in the material master record but no total 
shelf life, then you have to enter the Shelf Life Expiration Date during goods receipt pro-
cessing. If a total shelf life is entered in the material master record, then you enter a Pro-
duction Date during goods receipt. In this case, the app automatically calculates the 
shelf-life expiration date by adding the shelf life to the entered production date. If the 
date entered isn’t sufficient in the sense of the shelf life, an appropriate message is dis-
played during goods receipt processing.
 
Note
From the item detail screen, you can navigate to the Manage Batches app (F2462) to 
change or create batches accordingly. To make this button visible, the user role needs 
the following dependent business catalog to be assigned: SAP_SCM_BC_BATCH_
MGMT_MC.
5.6.2    Serial Numbers
To track goods and their movement, SAP S/4HANA offers capabilities to assign serial 
numbers during goods receipt processing. Serial numbers are taken into consideration 
for the following purposes:
▪Traceability and audit trails
▪Precise tracking of inventory and issuing of items and goods
▪Compliance and regulation
▪Return and repair processing
To support serialized materials, the post goods receipt SAP Fiori apps were enhanced 
with the inclusion of serial numbers. During goods receipt posting, the serial numbers 
can be assigned, changed, or removed. Serial numbers can be automatically or manu-
ally assigned. We discussed the configuration of serial numbers in Chapter 3, Section 
3.2.2; in this section, we’ll see how they work in goods receipts.
Once you select a reference document (i.e., a purchase order), the purchase order item 
list in the main screen of the Post Goods Receipt for Purchasing Document app (or any 
of the goods receipt apps) lists all the purchase order items and provides the Auto-Create


<!-- Page 267 -->

5 Goods Receipt
268
Serial Numbers column (see Figure 5.25). You can select this checkbox to automatically 
assign serial numbers for the selected item during goods receipt posting.
Figure 5.25  Checkbox in Main Screen of Goods Receipt App to Enable Auto Create of Serial 
Numbers
If you don’t want the system to automatically create serial numbers, there is also the capa-
bility to manually assign, remove or change serial numbers of the related item for which 
you want to post the goods receipt. In that case, navigate to the item detail screen by click-
ing the related item in the main screen. On the detail screen, as shown in Figure 5.26, you’ll 
find a Serial Numbers section in which you can enter the related serial numbers.
Figure 5.26  Section for Serial Number Handling in Details Screen of Goods Receipt
As indicated in brackets on the right-hand side of the serial number input field, the app 
indicates the amount of required serial numbers. In our example, three out of three 
serial numbers are required for assignment and none are assigned yet.
To enable the auto creation of serial numbers, as shown in Figure 5.27, the checkbox on 
serial number item level would need to be ticked. All three serial numbers will be cre-
ated automatically if the checkbox at the top of the serial number table is ticked. The 
system automatically enables all checkboxes of the underlying table.
Figure 5.27  Serial Number Value Help Dialog


<!-- Page 268 -->

269
5.6 Process Variants
In addition to the auto creation of serial numbers, you might also assign existing serial 
numbers. Manual assignment of serial numbers can be performed by clicking Assign 
Existing at the top of the screen. The related value help window of existing serial num-
bers shows up and the existing serial numbers can be assigned to the current item for 
goods receipt posting.
5.6.3    Goods Receipt Blocked Stock
If a goods receipt is posted into the goods receipt blocked stock, the app uses movement 
type 103.
Generally, the goods receipt blocked stock isn’t owned by the receiving company at the 
point of the goods receipt, so the goods receipt blocked stock is nonvaluated.
If the goods receipt is posted into the goods receipt blocked stock by selecting Goods 
Receipt Blocked Stock, there are different possibilities to release the stock out of the 
goods receipt blocked stock. These new posting possibilities are displayed after the 
same purchase order is loaded again after the initial goods receipt was posted into the 
goods receipt blocked stock.
The dropdown list in the Stock Type column is enhanced with the related stock types, 
as shown in Figure 5.28, so that the goods receipt blocked stock can be released accord-
ingly by a related goods receipt posting.
Figure 5.28  Goods Receipt Blocked Stock Postings after the Initial Goods Receipt
5.6.4    Mandatory Quality Inspection
Goods receipts of materials can be posted directly into the quality inspection stock. This 
is a stock where materials are kept that need to be checked by a quality inspection 
before they can be released for further usage (i.e., by posting into the unrestricted-use 
stock). In this case, in the Quality Management view of the material master record, the 
Post to Inspection Stock setting has to be enabled, as shown in Figure 5.29. This setting 
is then copied as the default to purchase order items and goods receipt items for this 
material. The setting can be done in the Manage Product Master Data app (F1602).


<!-- Page 269 -->

5 Goods Receipt
270
Figure 5.29  Material Master Setting on Plant Level for Quality Management
The material posting will occur in this case without creation of an inspection lot (see the 
second item in Figure 5.30).
Figure 5.30  Goods Receipt Items with Different Stock Type Handling
This setting can be overruled by entering the more detailed inspection setup data in the 
material master record (i.e., more detailed inspection types) that might create inspec-
tion lots, as shown in Figure 5.31. If inspection types are assigned, the Post to Inspection 
Stock setting is deactivated because a more detailed setting via inspection types was 
chosen.
Figure 5.31  Setting on Plant Level for Material to Enable Inspection Lot Creation


<!-- Page 270 -->

271
5.6 Process Variants
If the mentioned preconditions are met, the stock type is preassigned with Quality 
Inspection accordingly and can’t be changed by the end user during goods receipt pro-
cessing (refer to the first item in Figure 5.30).
5.6.5    Decentralized Warehouse Management
If a goods receipt is posted into a storage location that is managed by a decentralized 
warehouse, the application automatically generates an inbound delivery to be processed 
by the warehouse management system (WMS). More information about inventory man-
agement and the linkage of decentralized warehouse management is provided in Chap-
ter 9, Section 9.3.2.
5.6.6    Direct Posting with Embedded EWM
As of SAP S/4HANA Cloud Private Edition 2019 and in SAP S/4HANA Cloud Public Edition 
2005, the synchronous goods receipt posting of inventory management and embedded 
extended warehouse management (EWM) was implemented. Now inventory manage-
ment is updated with the related posting of a material document, which contains the 
updated stock information to be posted in the SAP S/4HANA system; working in parallel 
in the background, embedded EWM data is also processed synchronously. This process 
improves efficiency, as no delivery document needs to be created. Without the need to 
create a delivery, the stock information is updated in SAP S/4HANA and embedded EWM. 
The related EWM warehouse document number is stored in the material document too.
To perform these synchronous postings, the system needs to be set up to support the 
synchronous posting of embedded EWM data. For receipt posting based on a purchase 
order, the goods receipt storage bin determination needs to be set up via the Determine 
Staging Area – Inbound app. If the bin determination is not set up or the bin could not 
be automatically assigned, the app would offer a related error message.
If you want to enter the bin manually, Transaction MIGO has to be used to post the 
goods receipt, because here you could enter the storage bin manually, which is not sup-
ported in the SAP Fiori app.
5.6.7    Return Delivery
Customer returns can be posted directly in inventory management without the use of 
special sales and distribution functionality and without reference to a return delivery 
document by the usage of movement type 451. In this case, a material movement is 
posted into the returned blocked stock with reference to a certain customer. After-
wards, it can be transferred to unrestricted use by releasing it with movement type 453
(455 is used for releasing it to quality inspection stock). If a return from customer is 
based on a delivery, movement types 651 (returns blocked stock) and 653/655 are used 
for releasing it to unrestricted use or quality inspection stock, respectively. These kinds


<!-- Page 271 -->

5 Goods Receipt
272
of postings can be performed with the Post Goods Movement app (see Chapter 6, Sec-
tion 6.3.3).
5.6.8    Single- or Multi-Account Assignment
Procurement for consumption requires an account assignment for each purchase order 
item. The previously mentioned goods receipt apps in SAP Fiori dynamically detect that 
an item is based on consumption and provide the related account assignment informa-
tion to the end user. Per the purchase order item, the account assignment information 
is displayed in the purchase order Items table view shown in Figure 5.32.
Figure 5.32  Account Assignment Information
Clicking the Account Assignment micro chart opens a popup with more detailed infor-
mation (general ledger account and cost center), as shown in Figure 5.33.
Figure 5.33  Popup with Detailed Account Assignment Information
Click a purchase order item to access the detail screen shown in Figure 5.34. Here, a table 
view with the related account assignment information is displayed for consumption-
based procurement. In our example, the account assignment information is displayed: 
Percentage of assignment, G/L Account Number, and Cost Center.
If there is a multiple account assignment for a purchase order item, the share between 
the different accounts can be seen on the detail screen of the purchase order item. In 
this case, the purchase order item can be assigned to more than one account. The 
related micro chart in the purchase order item table now displays the share between the 
different accounts per purchase order item.


<!-- Page 272 -->

273
5.6 Process Variants
Figure 5.34  Account Assignment in the Detailed View
The same holds true if you click the micro chart to open the popup with the information 
about the different account assignments, as shown in Figure 5.35.
Figure 5.35  Popup with Multiple Account Assignment Details
In addition, in the detailed view of the purchase order item, the account assignment 
table outlines the detailed information of the different accounts assigned to the pur-
chase order item.
 
Note
The account assignment information can be displayed in the Post Goods Receipt for Pur-
chasing Document app in SAP Fiori. Adding or changing accounts isn’t supported. In 
such cases, the SAP GUI-based Post Goods Movement app might be used instead.
5.6.9    Split Valuation
All apps for posting goods receipt support split valuation of materials, and the related 
setting of split valuation must be performed upfront. In order to complete the setup, 
you need to perform two configuration steps (refer to Chapter 3, Section 3.2.4):


<!-- Page 273 -->

5 Goods Receipt
274
▪Activate Split Valuation for Global Data
▪Activate Split Valuation for Valuation Area
In the material master record of the related material, the valuation category (i.e., X for 
batch level) must be assigned. The valuation class determines which valuation types are 
allowed for assignment. For instance, for valuation category H (origin), the valuation 
type would be the country of origin (depending on the configuration you did for the val-
uation category).
Once you have opened the related purchasing document for goods receipt posting, 
you’ll find the input field of the valuation type in the details screen of the purchase 
order item. In the Plant Options section, as shown in Figure 5.36, all the mandatory fields 
(indicated by a red asterisk) must be filled out to complete the purchase order item suc-
cessfully: Plant, Storage Location, and Valuation Type.
The valuation type search help can help you easily find the right valuation type to use.
Figure 5.36  Detail Screen of Purchase Order Item with Input Field of Valuation Type
Once the valuation type is entered, you may return to the main screen by clicking the 
Apply button.
5.7    Real World Scenarios and Best Practices
We’ve walked through the goods receipt apps and looked at their basic functionality. 
Now, we want to merge these app capabilities with real-world requirements and scenar-
ios to give more of a practical point of view.
5.7.1    Implementing Simple Warehouse Management with Storage Bins
Warehouse management requires a lot of system configuration. Sometimes this setup 
is too cumbersome and effort intensive.
To provide basic warehouse management functionality, the Storage Bin field from the 
material master can be utilized. This reflects simple warehouse management in the sys-
tem without using the embedded EWM features (like storage bin determination).
As described in Section 5.1.2, the table view provides settings to display additional col-
umns, including the Storage Bin column. After the column is made visible, the storage


<!-- Page 274 -->

275
5.7 Real World Scenarios and Best Practices
bin of the material master record will be shown in the item table of the goods receipt 
apps if the field is not empty (see Figure 5.37).
Figure 5.37  Storage Bin Information in Goods Receipt Item
5.7.2    Simplifying Inbound Quality Control with Goods Receipt-Blocked Stock
As outlined in Section 5.1.2, the goods receipt apps support the usage of movement type 
103 (nonvaluated goods receipt blocked stock). In some scenarios, the stock doesn’t nec-
essarily need to be posted to the unrestricted use stock (movement type 101). This 
would mean that the stock would not be free to use in any other process, and it doesn’t 
need to be posted into quality inspection stock, because complex quality processes 
might not necessarily be set up or in favor of use. A simple quality check could be a 
check of measures or weight by a separate person besides the goods recipient without 
usage of more sophisticated quality processes of a separate quality department.
Besides that, movement type 103 (nonvaluated goods receipt blocked stock) might be 
used for goods receipt posting to prevent materials from being directly available for 
usage, and a basic inbound check could happen in case the goods received are obviously 
damaged. Later on, the stock has to be released by usage of movement type 105 (release 
of nonvaluated goods receipt blocked stock) to move it to unrestricted use. Valuated 
goods receipt blocked stock (movement types 107/109) are only supported by the Post 
Goods Movement app as of the time of writing (summer 2025).
We'll discuss how to monitor the entire process in Chapter 8, Section 8.4.4. 
5.7.3    Scanning Barcodes to Speed Up Goods Receipt
Processing goods receipt requires a manual data entry effort. Manual data input usually 
comes with a certain error rate; for instance, if the end user makes a typo. In addition, 
depending on the number of items of a delivery or purchase order document, the man-
ual data entry also takes a lot of time.
Barcode scanning makes the goods receipt process more efficient in that manner. The 
document number (e.g., purchase order and also item details) can be part of a barcode, 
which just needs to be scanned in order to automatically fill the input fields of the goods 
receipt apps.
As an example, we start with the Goods Receipt for Purchase Order app, as shown in 
Figure 5.38. After starting the app, you can begin the scanning process and enter a pur-
chase order by clicking the Scan button and scanning a related barcode. The system 
automatically utilizes the system hardware camera (i.e., on a tablet or phone) to scan 
the barcode.


<!-- Page 275 -->

5 Goods Receipt
276
Figure 5.38  Scan a Barcode Button in Goods Receipt App
If the camera popup is close by, a new popup with an input field comes up to enable the 
end user’s manual input, as shown in Figure 5.39.
Figure 5.39  Enter Barcode Popup
If the scanning was successfully performed, the purchase order number will be auto-
matically prefilled into the related input field of the app, and the related data of the pur-
chase order will be loaded for further processing in the case of a simple barcode.
In Chapter 6, Section 6.8.1, we’ll outline more examples of barcode scanning capabilities 
in inventory management and the supported apps with a GS1 barcode.
5.8    What’s Ahead for Goods Receipt?
The goods receipt processing variants discussed in Section 5.6 are supported via native 
SAP Fiori apps in SAP S/4HANA as of today. Besides these variants, there are some more 
specific matters that aren’t yet supported in these native SAP Fiori apps:
▪Quality certificates: If you request your vendor to deliver a quality certificate, then 
the delivery of the quality certificate can be confirmed during goods receipt process-
ing
▪More data input capabilities to support more flavors of synchronous postings with 
embedded EWM
In addition, some movement types aren’t currently supported by native SAP Fiori apps, 
such as movement types 107 and 109 for processing of valuated goods receipt blocked


<!-- Page 276 -->

277
5.9 Summary
stock and release of the same, respectively. In such cases, the Post Goods Movement app
based on Transaction MIGO must be used.
5.9    Summary
In this chapter, the role-based SAP Fiori apps for goods receipt processing were dis-
cussed for purchase orders, inbound deliveries, production orders, goods receipt with-
out reference, and process variants.
As of the time of writing, goods receipts might also have to be processed with the Post 
Goods Movement app due to some lacking features in the current version of the native 
SAP Fiori apps.
Beside these feature gaps, the native SAP Fiori apps offer modern and state-of-the-art 
capabilities such as integrated navigation (semantic object based, i.e., to the supplier 
object page) or increased usability of attachment services. Through the usage of sophis-
ticated user application presettings, such as preassignment of delivery quantity, preset-
ting of required print output forms, the intelligent column handling in the goods 
receipt apps, and the barcode scanning capabilities, these native SAP Fiori apps make 
end users’ daily work much easier and more efficient.
We’ve now looked at SAP S/4HANA applications supporting the flow of goods into your 
company. In the next chapter, we’ll take a deeper look at the core inventory manage-
ment capabilities.
