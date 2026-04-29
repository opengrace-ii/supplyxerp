# Chapter 6 Core Inventory Management


<!-- Page 278 -->

279
Chapter 6
Core Inventory Management
This chapter gives step-by-step instructions for performing core inven-
tory processes in SAP S/4HANA: inventory monitoring, exception han-
dling, physical inventory, transfers, scrapping, and so on.
In the previous chapter, we discussed the required steps and available SAP Fiori apps to 
control the inward flow of goods. After the required goods are received, they have to be 
managed accordingly. To do so, we’ll now focus on the core inventory management 
capabilities to manage the available goods.
All material movements take place based on a material document. In this chapter, we’ll 
begin with a look at the available SAP Fiori apps to monitor these documents. We’ll 
move on to the quantity and value of available materials and how they are shared 
between different stock types, with a discussion of stock identification capabilities. In 
addition, we’ll see how stock can be moved between different stock types or organiza-
tional entities, such as plants.
Sometimes, new storage locations or plants are set up, which makes an initial entry nec-
essary, or goods have to be scrapped because they reach their shelf-life date or are dam-
aged. We’ll describe the handling of these special cases in this chapter as well. In 
addition, if an incorrect material document posting is made—for instance, you entered 
a wrong quantity—you might want to reverse the related material document, which is 
also described in this chapter.
After discussing the physical inventory process and available apps required to keep the 
stock and financial information up to date, we’ll conclude with some real-world best 
practices and a look at what’s ahead for core inventory.
6.1    Monitoring Core Inventory Documents
The central entity in inventory management in SAP S/4HANA is the material docu-
ment. For each material movement, a material document is created and stored in the 
database to ensure seamless documentation of a company’s stock situation.
The following sections describe in more detail how to monitor the material document 
and the document flow in the different inventory management applications.


<!-- Page 279 -->

6 Core Inventory Management
280
6.1.1    Material Document Components
A material document consists of a material document header and related material doc-
ument items.
The material document header contains the following information:
▪Document Date
▪Posting Date
▪Created by
▪Document Type
▪Inventory Transaction Type
▪Delivery Note
▪Bill of Lading
▪Note
On the material document item level, a lot of information is stored that is dependent 
on the transaction type (movement type):
▪Material Document Number
▪Material Document Item Number
▪Material Document Year
▪Material
▪Goods Movement Type
▪Quantity
▪Plant
▪Storage Location
▪Stock Type
▪Batch
▪Customer
▪Purchase Order
▪Sales Order
Basically, the movement type controls which fields are mandatory to be filled.
6.1.2    Use Enterprise Search to Identify Inventory Documents
The enterprise search functionality is embedded in the SAP Fiori launchpad and pro-
vides a Google-like search pattern to easily search for business object instances, such as 
a material document. This search also allows a fuzzy search, meaning that the search 
term doesn’t necessarily have to be a material document. Plant or material names can 
also be search terms for identifying material documents via enterprise search. You can 
access enterprise search by clicking the magnifier icon (see Figure 6.1).


<!-- Page 280 -->

281
6.1 Monitoring Core Inventory Documents
Figure 6.1  Enterprise Search: Magnifier Icon
After the search term is entered (Plant 1010, in our example), the related result is dis-
played, as shown in Figure 6.2, in a list format, including the total number for search 
results. In addition, the value that was found is highlighted by the enterprise search 
functionality. Depending on the given user authorizations (part of business catalogs; 
see Chapter 3, Section 3.6), navigation targets are provided to the end user. In general, 
the search result for the material document provides a navigation to the Material Doc-
ument Overview app in SAP Fiori (discussed in the next section) for accessing more 
detailed information about the material document, such as accounting assignment 
information that isn’t given in the search result list directly. The search result for the 
material document is based on the material document header data. The fields used for 
searching the material document also include important fields related to the material 
document item (see previous list), such as material, plant, or storage location.
Figure 6.2  Material Document Search Result
Usually, productive systems contain a lot of material documents up to a high triple-
digit million number of material documents. Therefore, sometimes the search provides


<!-- Page 281 -->

6 Core Inventory Management
282
a broad amount of material documents as a search result. To find the relevant data, the 
search framework provides additional drilldown and filter capabilities based on the 
given search result, as shown in Figure 6.3.
By just clicking the relevant filter criteria (left-hand side of the screen), such as Company 
Code or Plant, the search result can be narrowed down to a reasonable result set.
After the relevant search result is found, you can get a more detailed view of the mate-
rial document by navigating to the material document object page, which is part of the 
Material Documents Overview app described in the next section.
Figure 6.3  Filters for the Search Result
6.1.3    Material Documents Overview
The Material Documents Overview app (F1077) in SAP Fiori is the central method for 
accessing material document information. The app can be started standalone from the 
related tile on the SAP Fiori launchpad home screen. In this case, the app is started with 
a filter bar so that you can select the required material documents according to your 
needs. The filter fields shown in Figure 6.4 can be adapted according to your needs via 
the Adapt Filters functionality. Click the Adapt Filters button to open the related popup 
in which you can choose additional filter fields. The adjusted filter bar settings can also 
be saved as variants so that every time you start the application, the relevant filter fields 
are displayed directly.


<!-- Page 282 -->

283
6.1 Monitoring Core Inventory Documents
Figure 6.4  Filter Bar
As described in the preceding chapters, the movement type is one central attribute con-
trolling the relevant information and fields of a material document. The movement type 
is a three-digit number, for example, 101 for goods receipt. A lot of movement types exist 
in the system, so it might be hard at times to remember the right movement type that 
you’re searching for. Therefore, the Stock Change filter was introduced in SAP S/4HANA 
that combines categories of movement types with regards to their stock impact, as 
shown in Figure 6.5:
▪No Stock Change
Material document postings that don’t change the stock level (e.g., goods movement 
type 340, batch revaluation).
▪Stock Decrease
Material document postings that lower the stock level (e.g., goods movement type 
201, goods issue to cost center).
▪Stock Increase
Material document postings that increase the stock level (e.g., goods movement type 
101, goods receipt).
▪Transfer Posting
Material document postings within an issuing and receiving organizational unit 
(e.g., goods movement type 311, one-step storage location to storage location).
Figure 6.5  Stock Change Filter
After the right filter values are set and you click the Go button, the system outlines the 
related material documents, as shown in Figure 6.6. The columns displayed in the result


<!-- Page 283 -->

6 Core Inventory Management
284
list can be adjusted to your needs via the table settings feature by clicking the gear icon 
at the top of the results table.
 
Note
The result list shows one line per material document item, which means if the material 
document contains two items, both are outlined in the result if the search criteria meet 
both material documents’ items. If you'd like to display two lines per transfer posting in 
the result list, in the filter criteria, you must set Include Auto-Created Item (Transfer) to 
true.
The example in Figure 6.6 shows the breakdown of material documents items for Mate-
rial Document 4900008750.
Figure 6.6  Material Document Result List
You can navigate to the material document object page by selecting one of the material 
document items.
In the header of the material document object page, the related material document 
number and the material document year are shown. In addition, information about 
reversed items is displayed here (see Figure 6.7). More information about how a mate-
rial document can be reversed is provided in Section 6.5.
Figure 6.7  Object Page Header
The material document object page consists of four different tabs:
▪General Information
This tab was already described at the beginning of the chapter and provides the mate-
rial document header data.


<!-- Page 284 -->

285
6.1 Monitoring Core Inventory Documents
▪Items
This tab offers the related material document item information. For the given exam-
ple of material document 4900008750, this means that four material document 
items are displayed in a table format, as shown in Figure 6.8. In addition, this table’s 
columns can be adjusted via the gear icon at the top of the table.
Figure 6.8  Object Page Item List
A detail page for each material document can be accessed by clicking a material doc-
ument item.
Beside the header information of the material document number and material doc-
ument number item, the detail page contains two tabs. The Output Management tab, 
shown in Figure 6.9, offers information if the material document items included an 
output-related activity, such as a print form or an email. The related output can be 
displayed accordingly.
Figure 6.9  Output Management Tab in the Material Document Item Detail Page
In addition, a tab with more detailed Accounting information is given, as shown in 
Figure 6.10. Here, you can find the related financial accounting information for the 
general ledger account and cost center, for instance.
Figure 6.10  Accounting Tab in the Material Document Item Detail Page
▪Process Flow
In this tab, you gain a graphical illustration of the predecessor and successor business 
documents of the current material document. We’ll walk through this in detail in the 
next section.


<!-- Page 285 -->

6 Core Inventory Management
286
▪Attachment
This tab shows the attached items of the material document (see Figure 6.11). It’s pos-
sible to display the attached items in detail, attach additional items, or remove exist-
ing ones.
Figure 6.11  Attachment Tab
Material Documents Overview is the central app for inventory management in SAP
S/4HANA due to the importance of the material document entity. Therefore, the material 
document object page can also be reached via direct navigation from several apps on 
the SAP Fiori launchpad. To give a simple example, look at Chapter 5, where we consid-
ered the different SAP Fiori-based goods receipt processes. If a goods receipt is success-
fully posted in the system, and the related material document is created accordingly, 
the system shows a popup outlining the newly created material document, as shown in 
Figure 6.12.
Figure 6.12  Success Popup with Material Document Number
Included in this popup is an implicit navigation that leads you directly to the material 
document object page without displaying the initial filter bar so that the material doc-
ument information is directly displayed.
This navigation is based on the MaterialMovement sematic object so that it’s centrally 
embedded in the SAP Fiori launchpad. This also enables apps that aren’t part of the 
inventory management area to provide navigation to the material document object 
page. However, you must have sufficient authorization to display material documents.
6.1.4    Analyze the Document Flow via the Material Document Object Page
While the material document is a rather central entity in the system, from a business 
process perspective, there are several possible predecessors and successors (also called 
follow-up documents) of a material document.


<!-- Page 286 -->

287
6.1 Monitoring Core Inventory Documents
A predecessor document of a material document could be a purchase order or a delivery 
for instance. After a goods receipt is posted, and the related material document is created, 
the material document contains the information about the predecessor document.
Inventory management in SAP S/4HANA automatically triggers the creation of the 
required successor documents, such as relevant accounting documents.
The Material Documents Overview app, which we discussed in the previous section, offers 
a graphic illustration of the business process document flow in the Process Flow tab.
The process flow contains separate steps for each relevant predecessor and successor 
document, such as accounting documents that include the document number to give 
the end user a context of the given material document, as shown in Figure 6.13.
Figure 6.13  Process Flow
In addition, the functionality of the process flow and the related business documents 
isn’t restricted to just displaying the related documents. It also provides an embedded 
navigation in the SAP Fiori launchpad that you can access by simply clicking the busi-
ness document, as you can see in Figure 6.14.
 
Note
A display authorization is required for the business document in the process flow to be 
enabled for using the related navigation target.


<!-- Page 287 -->

6 Core Inventory Management
288
In general, the business process flow provides a comprehensive process and process steps 
view, including the environment of the chosen material document, in a graphical way.
Figure 6.14  Navigation Out of the Process Flow
6.2    Stock Identification
One of the most critical and important functionalities of inventory management is to 
provide up-to-date and accurate information regarding a company’s stock situation as 
the basis for daily work.
The current stock and the stock level over time for different reporting dates and time 
frames might be of interest. Supplementary stock values may also help in making the 
right decisions. Finally, all these figures have to be provided in a timely and performant 
manner.
 
Note
It’s important to distinguish the daily stock information requirements faced by the ware-
house clerk and inventory manager, which are described in this chapter, from the require-
ments faced by an inventory analyst. These analytical requirements are described in 
Chapter 8.
In this section, we’ll walk through how to identify stock using key SAP Fiori apps for 
both a single material and multiple materials, before discussing the stock overview.


<!-- Page 288 -->

289
6.2 Stock Identification
6.2.1    Stock – Single Material
The Stock – Single Material app (F1076) provides a view of the stock situation for a single 
material. The stock types that can be accessed by this app are configured in database 
table T200A, as shown in Figure 6.15. If an entry for a stock type is given in the table, the 
SAP Fiori app provides the related column to be displayed in the results table. So, if you 
want to hide a certain stock type permanently because it’s never used in your company, 
you can simplify the SAP Fiori app output by removing (or not adding) the related stock 
type in table T200A. The mechanism of table T200A and its entries are used in several SAP 
Fiori apps for inventory management. For each app, we’ll mention whether it makes use 
of the table T200A mechanism. You can access the data maintenance of table T200A by 
running Transaction SM30 in your SAP S/4HANA backend and entering “T200A” as the 
maintenance object.
Figure 6.15  Table T200A Entries for Stock Types
After opening the app from the SAP Fiori launchpad, enter the material you want to 
check the stock situation for, as shown in Figure 6.16.
The app offers type-ahead search and standard value help for getting the required mate-
rial out of the system. Of course, the app can also be started via SAP Fiori launchpad nav-
igation. In this case, a material is passed as a parameter, and the application directly 
loads the stock figures for the material.
Figure 6.16  Material Input Field
When the material is entered, the application provides some general header data of the 
material, such as material number, material name, material type, and base unit of mea-
sure, as shown in Figure 6.17.


<!-- Page 289 -->

6 Core Inventory Management
290
Figure 6.17  Material Header Data
Below the header data, the stock figures are provided in a hierarchical view (see Figure 
6.18). The organizational levels plant and storage location are provided in the table.
Figure 6.18  Stock Figures on the Plant Level
The storage location level can be expanded or collapsed via the arrow icons at the top 
of the results table, providing the view shown in Figure 6.19. A search functionality is 
also provided if the material has a wide variety of organizational assignments to plants 
and or storage locations so that you can easily find your best fitting result.
Figure 6.19  Stock Result Expanded to the Storage Location Level
If a batch will be assigned to the material, its batch name is provided in a separate col-
umn after the Storage Location column. The columns of the different stock types can be 
adjusted according to your needs via the gear icon at the top right of the table. This set-
ting allows you to decide, per stock type, if the related stock type should be shown in 
the results table and if it should be shown in the micro chart of the Stock History. In


<!-- Page 290 -->

291
6.2 Stock Identification
addition, the app provides three general settings via the application settings in the Me 
Area that you can adjust to get a more focused view of the stock figures:
▪Expand list by default
If this setting is active, the organizational entities are expanded in the results table 
once the data is loaded.
▪Hide all empty columns
If this setting is active, stock types with an empty result for all organizational entities 
are hidden.
▪Hide all empty rows
If this setting is active, rows with an empty result are hidden.
The given stock figures are determined with the current date as the reporting date when 
the material is selected. If you need to get the stock figures from the past to a certain 
date, you just change the Reporting Date to the required date in the past. The system 
then determines the historical stock figures. If the Reporting Date is left empty, the final 
stock of the current posting period is determined.
In addition, you might need to convert the stock figures to a different unit measure by 
changing the Unit Of Measure. Only the unit of measure in the same dimension and the 
parallel units of measures that are maintained in the material master record are pro-
vided as alternatives to the base unit of measure. Both capabilities are included in the 
header of the results table, as illustrated in Figure 6.18.
The app not only provides the stock figures as numbers but also contains a Stock History
chart outlining the stock level for the different stock types for the last year. This chart 
includes 12 different data points, one each for every month in the past year, starting 
from the given reporting date.
If you don’t rely on the stock figures and require a more graphical view, the results table 
can be toggled into a stock chart by selecting the upper right-hand icon, depicting the 
different stock types in chart, as shown in Figure 6.20.
Figure 6.20  Chart View of Stock Figures


<!-- Page 291 -->

6 Core Inventory Management
292
By clicking the Stock History chart in the last column of the results table, you access 
more detailed stock information of the selected item, as shown in Figure 6.21. A popup 
window provides the stock figures as a chart with the different stock types and allows 
you to select data points in the graphic for a deeper drilldown.
Figure 6.21  Stock History Chart
The Stock History chart not only contains the drilldown feature but also offers a sharing 
feature by clicking the arrow icon shown in Figure 6.22 so that you can share the given 
information within your inventory management team. In this case, the team members 
can access the same chart and drilldown level by just selecting the shared information.
With the drilldown functionality, as shown in Figure 6.23, you can step down into the 
selected data point and break down the stock information into the different days in the 
past and the underlying material documents that cause certain stock situations you 
want to analyze.
The navigation to the Material Documents Overview app is also embedded in the stock 
history chart (the Show Material Document button) so that you can directly navigate 
further to the material document object page to gain more insight into the material 
document in question.


<!-- Page 292 -->

293
6.2 Stock Identification
Figure 6.22  Sharing Feature in the History Chart
Figure 6.23  History Chart Drilldown Feature
6.2.2    Stock – Multiple Materials
In comparison to the Stock – Single Material app just discussed, the Stock – Multiple Mate-
rials app (F1595) provides a filter bar with a wide variety of possible filter values beyond 
the Material Number and Plant filters. Figure 6.24 depicts the filter fields of the standard 
variant. Of course, you can add additional filter fields by using the Adapt Filters function-
ality, as we discussed in Section 6.1.3. Same as before, fill in the filter for Reporting Date to 
determine the key date for which the application displays the stock information.
Figure 6.24  Filter Bar of the Stock – Multiple Materials App


<!-- Page 293 -->

6 Core Inventory Management
294
Click the Go button to see the standard results table, which is based on the standard SAP 
Fiori table control and provides a more detailed granular result set regarding attributes, 
as shown in Figure 6.25. In addition, standard table features, such as grouping, sorting, 
and exporting to Excel, are supported. In comparison to the Stock – Single Material app, 
no graphical information is provided in this app.
Figure 6.25  Result List with Stock Figures
Besides the stock information in Stock – Multiple Materials, you can also provide stock 
value information for the different stock types. Figure 6.26 shows the supported stock 
values that can appear as columns in the results table. The screen can be accessed by 
clicking the gear icon in the upper-right corner of the table. Select the stock value you 
want to display, and click the OK button to see the screen shown in Figure 6.27.
Figure 6.26  Configuration of Different Stock Values


<!-- Page 294 -->

295
6.2 Stock Identification
Figure 6.27  Result List That Includes Stock Values
Stock values can be provided in different currencies because the result set shows cross-
plant stock information and values. If these plants are assigned to different company 
codes, which might have different currencies, the result set can provide more than one 
currency. In this case, the SAP Fiori app automatically provides a detailed view breaking 
down the different stock values for the given currency of the stock values, as shown in 
Figure 6.28. You can access this by clicking the Show Details option at the lower-left cor-
ner of the screen.
Figure 6.28  Stock Values Listed by Currency
 
Note
Initially, in the standard display, the stock value filters and columns in the results table 
are hidden and have to be added manually to be displayed. This setting can be saved as 
an individual variant afterward.
More details about how stock values are calculated are provided in Chapter 8, Section 8.2
for value-based analytics and the related organizational units in Chapter 3, Section 3.1.2.


<!-- Page 295 -->

6 Core Inventory Management
296
6.2.3    Analyze Stock in Date Range
In comparison to the stock identifying apps that we’ve introduced, the Analyze Stock in 
Date Range app (F3749) allows you to compare inventory KPIs based on a selected time 
period. Two successive time periods of KPIs can be compared for detailed stock analysis 
and its evolution over time. Therefore, this app provides capabilities to time period-
related stock KPIs.
More details and examples will be provided in Chapter 8, Section 8.2.2, where we focus 
on inventory analytics.
6.2.4    Display Stock Overview
The Display Stock Overview web-based SAP GUI app is based on Transaction MMBE. 
This app’s stock information overview provides some more information, like the native 
SAP Fiori apps do, for special cases (e.g., reservations).
After you’ve opened the Display Stock Overview app in the SAP Fiori launchpad (based 
on Transaction MMBE), fill out your Database Selections, as shown in Figure 6.29. This 
includes your Material, Plant, Storage Location, and Batch, if applicable.
Figure 6.29  Stock Overview Selection Criteria
The remaining criteria to fill out are shown in Figure 6.30. With this more detailed selec-
tion criteria, the list output can be adjusted to your needs. In this example, entries with 
zero stock quantity are hidden to optimize the list output by checking the No Zero Stock 
Lines box.
To access the results, click the Execute button (not shown). The application result 
header contains the standard material information and allows you to change the Unit 
of Measure in which the stock information is displayed, as shown in Figure 6.31.
Like the SAP Fiori stock information apps, the Stock Overview app shows the different 
stock figures for the different stock types. In addition, reservations available for the 
given material are shown in this app. More information about material reservations is 
provided in Chapter 7, Section 7.1.
In addition, the result set contains information about stock that isn’t managed by 
inventory management directly, such as On-Order Stock, as shown in Figure 6.32.
Let’s move on to the material movements and related postings available in SAP S/4HANA 
with a focus on native SAP Fiori apps.


<!-- Page 296 -->

297
6.2 Stock Identification
Figure 6.30  Stock Overview Detailed Selection Criteria
Figure 6.31  Stock Overview Result Header
Figure 6.32  Different Stock Types in the Display Stock Overview App


<!-- Page 297 -->

6 Core Inventory Management
298
6.3    Stock Transfer
We’ll begin with stock transfers. The essence of each stock transfer posting is that two 
organizational units are affected by the material posting so that an issuing and a receiv-
ing organizational unit are involved. The issuing organizational unit is the place where 
the goods are taken from, and the receiving organizational unit is where the goods are 
received.
Generally, transfer postings might occur between two storage locations in the same 
plant (discussed in Section 6.3.1). Materials stock transfer between plants is covered in 
Section 6.3.2. Stock transfers with materials that have certain attributes to take care of 
(e.g., serial numbers), which aren’t yet supported in the native SAP Fiori apps, have to 
be performed with the Post Goods Movement web-based SAP GUI app, which is 
described in Section 6.3.3. Transfer postings might need a stock transfer order as a ref-
erence document, which is discussed in Section 6.3.4. Finally, we’ll also touch on the 
topic of advanced intercompany stock transport in Section 6.3.5.
6.3.1    Stock Transfer – In-Plant
The Stock Transfer – In-Plant app (F1061) opens after you click the Stock Transfer – In-
Plant tile. Select your Material and Plant, as shown in Figure 6.33.
Figure 6.33  Transfer Stock – In-Plant App: Material and Plant Information
After you select the material, a micro chart showing the material master information 
for three major stock types appears, as shown in Figure 6.34:
▪Unrestricted-Use Stock
▪Blocked Stock
▪Stock in Quality Inspection
A calculation of an important inventory KPI is included in the header by calculating the 
range of coverage on the fly when the material is selected. In the given example, the 
range of coverage is calculated with 870 days. This feature is an example of embedded 
analytics, which are part of transactional applications and outlines one major benefit of 
SAP S/4HANA and SAP Fiori apps.
The transfer posting within the same plant is based on a touch-enabled usability con-
cept by providing buttons for selecting the source and target storage location. This 
enables the app to be easily used on mobile devices.


<!-- Page 298 -->

299
6.3 Stock Transfer
Figure 6.34  Header with Range of Coverage KPI
After you enter the Material and Plant, the results table is shown (see Figure 6.35) and 
contains all storage locations and their stock information for the selected plant and 
material combination. In addition, an overall sum of each stock type is shown at the end 
of each column.
Figure 6.35  Results Table Including Touch-Based Transfer Posting
The columns for the stock types are based on the configuration in table T200A. If a stock 
type is maintained in table T200A, the related column is displayed accordingly.
A result line for a storage location is shown when the material master record for the 
material is already maintained for the storage location. If the material master record 
isn’t maintained accordingly yet, the application offers an Add Storage Location feature 
to select storage locations that aren’t assigned to the material in the material master 
record as of now. Click Add Storage Location (top of table) to access the Select Storage 
Location screen shown in Figure 6.36, and select the appropriate checkbox.
With the first material movement into this storage location, the material master record 
is updated automatically. As a prerequisite, you must set the Create Storage Location 
Automatically option in Customizing. In this setting, you can define whether this fea-
ture should be enabled on the plant and/or storage location level.
Note
This setting is available in SAP S/4HANA as an IMG activity and in SAP S/4HANA Cloud 
Public Edition as self-service configuration UI (SSCUI). Refer to Chapter 3, Section 3.1.3, 
for more details about the Create Storage Location Automatically setting.


<!-- Page 299 -->

6 Core Inventory Management
300
Figure 6.36  Creating the Storage Location Assignment Automatically
Now let’s discuss how a transfer posting is performed. As described, the results table 
contains buttons for selecting the sending storage location. You just have to click the 
related button, as shown in Figure 6.37. After the selection is made, the button is marked 
as active and the allow transfer posting target buttons are kept active so that you can 
select the target location by just selecting the second button.
The selection of the button implicitly includes the selection of a certain movement
type because the button is located in a specific column for a certain stock type (in the 
Unrestricted-Use Stock column, in our example).
Figure 6.37  Transfer Posting by Button Selection
After the target storage location is selected (second button clicked), a popup appears 
containing the input fields for required information for the material movement. Enter 
your Quantity and date information (Document Date and Posting Date) in the manda-
tory fields. If you choose the wrong direction for the storage locations, you can just 
exchange the target and source storage location by using the exchange button (the two 
arrows) in the middle of the popup screen.


<!-- Page 300 -->

301
6.3 Stock Transfer
This app supports special stock types such as E (orders on hand), K (supplier consign-
ment), and Q (project stock). The selection of the special stock happens implicitly when 
a source storage location is chosen via the popup, which only appears when the stock 
contains special stock, as shown in Figure 6.38.
Figure 6.38  Special Stock Popup
Special transfer postings in the same storage location but between the same special stock 
indicators are also possible: from E to E or from Q to Q. The related information for the 
special stock type, such as a sales order item for special stock type E, can be entered in the 
posting popup. The related fields are displayed based on the chosen special stock.
Figure 6.39  Add to List Feature


<!-- Page 301 -->

6 Core Inventory Management
302
In SAP S/4HANA Cloud Public Edition, a new item list feature was introduced to enable 
postings of material documents with more than one item. Simply click the Add to List
button, as shown in Figure 6.39, to put the entered data to an item list for later posting.
Once you add an item to the list, a new ITEM LIST tab is shown in the app (see Figure 6.40) 
depicting all the items that were put into the list.
Figure 6.40  Item List Tab
Once all items are created, the material document can be posted via the Post button on 
the upper right-side of the item list table (not shown).
6.3.2    Transfer Stock – Cross-Plant
The Transfer Stock – Cross-Plant app (F1957) is structured in a similar way as the Transfer 
Stock – In-Plant app. However, in this app, the Plant filter isn’t available. You only need 
to choose a Material, as shown in Figure 6.41.
Figure 6.41  Material Selection
Once you select the material, the app loads the related data and provides stock figures 
for the most important stock types in the app header via a micro chart, as shown in 
Figure 6.42.


<!-- Page 302 -->

303
6.3 Stock Transfer
Figure 6.42  Header Information
After selection of a certain material, the results table shown in Figure 6.43 breaks down 
the stock information for all relevant plants, including a Batch column on the left-hand 
side for separation of batch-related stock information.
Figure 6.43  Results Table with Plant and Batch Breakdown
Again, the selection of source and target location is based on button navigation as in the 
Transfer Stock – In-Plant app. Select the issuing button according to your chosen move-
ment type (e.g., Unrestricted-Use Stock in Figure 6.44).
Figure 6.44  Transfer Posting via Button Selection
If a material movement isn’t allowed, the target button gets deactivated so that you 
can’t select it. Deactivation might occur due to insufficient authorizations for move-
ment types or missing Customizing for the transfer posting between different plants.
After you select a receiving button, the popup shown in Figure 6.45 appears. Enter your 
quantity and date information to post your material document.
The stock transport order settings for this app are described in Section 6.3.4.


<!-- Page 303 -->

6 Core Inventory Management
304
Figure 6.45  Transfer Posting Popup
In SAP S/4HANA Cloud Public Edition, the support of a material document item list was 
introduced to the Transfer Stock – Cross Plant app, too.
6.3.3    Post Goods Movement
In SAP S/4HANA, the Post Goods Movement web-based SAP GUI app, based on Transac-
tion MIGO (or in this case, Transaction MIGO_TR), is available for processing stock 
transfer postings.
Some features, such as support for serial numbers, aren’t available in the preceding SAP 
Fiori app. In this case, the Post Goods Movement web-based SAP GUI app can be used 
instead.


<!-- Page 304 -->

305
6.3 Stock Transfer
The web-based SAP GUI app renders the SAP GUI transaction in a browser HTML envi-
ronment. Execute the Post Goods Movement app from the SAP Fiori launchpad (Trans-
action MIGO) to access the app entry screen shown in Figure 6.46.
Figure 6.46  Transaction MIGO Rendered in the Web-Based SAP GUI Environment
Here, the movement type for transfer posting can be entered or selected via search help 
in the TF trfr within field in the upper-right corner. Other fields to fill out include the 
issuing and receiving plant and the related quantity.
After the entered data is checked or posted (using the Post button at the bottom of the 
screen, not shown), an error log might appear outlining whether erroneous data was 
entered. An example is given in Figure 6.47.
Figure 6.47  Error Log in the Post Goods Movement App
Compared to the new SAP Fiori apps, this app behaves differently. The inventory man-
agement SAP Fiori apps try to offer only available and valid data for further processing.


<!-- Page 305 -->

6 Core Inventory Management
306
In the web-based SAP GUI apps, you can enter data that isn’t consistent in an attempt 
to process the data; you’re only warned or stopped after entering all data and trying to 
check/post your input.
6.3.4    Working with Stock Transport Orders
In the Transfer Stock – Cross Plant app, you can post transfer postings between different 
plants. From a business perspective, there are several ways to do this. The direct posting 
is possible without a stock transport order, as described in Section 6.3.2.
Transfer posting can also be based on a stock transport order, which is a business doc-
ument containing all relevant information about the stock transfer that acts as a hook 
for dependent business objects, such as delivery or accounting. The Transfer Stock – 
Cross Plant app also allows the creation of a stock transport order via the Create Stock 
Transport Order button shown in the posting popup in Figure 6.48.
Figure 6.48  Stock Transport Order Creation
The button becomes active if the Customizing for the involved plants is present. For the 
related Customizing settings, refer to Chapter 3, Section 3.1.7.


<!-- Page 306 -->

307
6.3 Stock Transfer
Figure 6.49 shows the stock transport order process in SAP S/4HANA, which supports 
the internal movement of one material from one plant to another. Several variants of 
the process exist. What they all have in common is that the process is initiated by a stock 
transport order as the special type of purchase order and is completed by a goods 
receipt. During the process, the inventory stock has the stock in transit stock type (see 
Chapter 2, Section 2.1). Stock transport orders can be created automatically by material 
requirements planning (MRP) runs or manually by end users (see Chapter 7, Section 7.1).
Figure 6.49  Stock Transport Order Process and Timeline
For creation and monitoring, it’s crucial to know whether the stock transport order pro-
cess timeline is on track or delayed. These stock transport orders can be monitored with 
a special Overdue Materials – Stock in Transit app (F2139), which we’ll introduce in Chap-
ter 8, Section 8.4.3.
6.3.5    Advanced Intercompany Stock Transport
In addition to moving stock between different plants in the same company, the 
advanced intercompany stock transport process targets stock movements between 
plants in different companies (company codes) in the same organization. The advanced
part offers more integrated process features (i.e., in transportation management [TM], 
extended warehouse management [EWM], or advanced available-to-promise [ATP]), 
automated document creation, and monitoring via the Monitor Value Chains app
(F4854). Basically, five different steps are part of the advanced intercompany stock 
transport process:
1. Purchase order handling
2. Delivery handling
3. Customer invoice-based billing
4. Intercompany supplier-based invoicing and invoice verification
5. Goods movement processing
Creation of Stock
Transport Order 
Creation of
Delivery
Goods Issue 
Goods Receipt 
Delivery Date 
Plant 0001
Plant 0002
Track Various Steps with Documents Posted in SAP S/4HANA
Move Material A from One Plant to Another
Days in Transit
Picking/Packing
in Warehouse


<!-- Page 307 -->

6 Core Inventory Management
308
Processing of goods movements is the focus for us in the context of inventory manage-
ment. In the processing of goods movements, we distinguish three different steps:
1. The goods issue for the outbound delivery from the delivery company from the 
unrestricted stock into the stock in transit. An inbound delivery is automatically cre-
ated for the receiver.
2. The goods issue from the stock in transit of the delivery company and afterwards the 
goods receipt into the stock in transit of the receiver.
3. The goods receipt for the receiver out of the stock in transit into the unrestricted-use 
stock for further processing.
These steps are controlled and supported by the Monitor Value Chains app. Further cov-
erage of this app is beyond the scope of this book.
 
Further Resources
For more detailed information on advanced intercompany stock transport, we recom-
mend Introducing Advanced Intercompany Sales and Stock Transfer with SAP S/4HANA
by Mrinal K. Roy (SAP PRESS, 2023).
6.4    Initial Entry and Scrapping
Initial entry and scrapping are two special cases in inventory management. Initial 
entries are often used to set up the stock information for new plants or storage loca-
tions. During normal business, initial entries should be avoided because they are non-
transparent from a goods movement perspective.
Scrapping is used if a material is damaged or has reached its shelf-life date to take it out 
of stock with a material document as reference. In SAP S/4HANA, there are two different 
applications available to post a scrapping for a certain material.
Both the SAP Fiori Manage Stock app (F1062) and the Post Goods Movement web-based 
SAP GUI app (Transaction MIGO) provide scrapping functionality, depending on your 
requirements. As of the time of writing (summer 2025), the Manage Stock app allows a 
single posting per material only. If you want to post scrapping or initial entries for more 
than one material at once, you must use the Post Goods Movement app to post material 
documents with more than one material document item.
We’ll take a look at both apps in this section.


<!-- Page 308 -->

309
6.4 Initial Entry and Scrapping
6.4.1    Manage Stock
The Manage Stock app in SAP Fiori has a similar layout to the Transfer Stock – In-Plant 
app, which we discussed in Section 6.3.1. First a Material/Plant combination has to be 
selected, as shown in Figure 6.50.
Figure 6.50  Input of Material and Plant
After material selection, the material header data is displayed as shown in Figure 6.51. 
Graphical stock information is shown as a micro chart for three important stock types. 
Additionally, the Range of Coverage in Days KPI is calculated on the fly based on the 
material consumptions of unrestricted-use stock in the past 30 days.
Figure 6.51  Material Header Data, Including the Range of Coverage KPI
After the material is selected, the results table shown in Figure 6.52 breaks down the 
stock information on the storage location level for the given plant and provides a but-
ton per stock type to take action. Again, the displayed stock type columns are controlled 
via the settings in table T200A.
Figure 6.52  Selection of Material via Button
Clicking the button for a certain stock type in a storage location opens a popup, as 
shown in Figure 6.53, which offers different stock change capabilities.


<!-- Page 309 -->

6 Core Inventory Management
310
Figure 6.53  Posting Popup with the Stock Change Field
Depending on your authorizations, the Stock Change dropdown list contains the 
allowed stock change activities for certain movement types, as shown in Figure 6.54:
▪201: Goods issue for cost center – unrestricted-use stock
▪221: Goods issue for a project
▪241: Goods issue for an asset
▪551: Scrapping from unrestricted-use stock
▪553: Scrapping from quality inspection stock
▪555: Scrapping from blocked stock
▪561: Initial entry of stock – unrestricted-use stock
▪563: Initial entry of stock – quality inspection stock
▪565: Initial entry of stock – blocked stock
Figure 6.54  Selection of Stock Change Type


<!-- Page 310 -->

311
6.4 Initial Entry and Scrapping
In addition, a Reason Code for the material movement posting can be selected, as shown 
in Figure 6.55, and is stored in the related material document.
Figure 6.55  Selection of Reason Code
 
Note
Reason codes can be defined in the following IMG activity: Materials Management • 
Inventory Management and Physical Inventory • Movement Types • Record Reasons for 
Goods Movements. They are also available as SSCUIs in SAP S/4HANA Cloud Public Edi-
tion.
After clicking the Post button, the related material document is created, and the mate-
rial document number is shown in a Success popup, providing a link navigation to the 
material document object page, as shown in Figure 6.56. If the storage location is man-
aged via warehouse management, an outbound delivery is created instead of a material 
document, as in our example.
Figure 6.56  Successful Posting of Initial Entry


<!-- Page 311 -->

6 Core Inventory Management
312
The Manage Stock app also offers the capability to post material documents with more 
than one item. If you have chosen the Post action in the popup, then a material docu-
ment with exactly one item is created. 
Sometimes end users want to perform similar postings in one shot and want to com-
bine different postings as part of one material document. To perform this with the Man-
age Stock app, you need to choose the Add to List button instead, as shown in Figure 6.57.
Figure 6.57  Manage Stock Post Popup with Add to List Button
The app will collect all selections in a list which can be accessed via a new Item List tab, 
as shown in Figure 6.58.
Figure 6.58  Item List View in Manage Stock App
Each item that has been added to the list will be shown. To perform the Post operation 
with the collected items, simply click the Post button on the upper right-hand side of 
the Item List tab. 
In SAP S/4HANA Cloud Public Edition, the app now supports special stock types. The fol-
lowing special stock types are supported for these movement types:
▪E (sales order stock)
▪K (consignment stock, supplier/vendor)
▪Q (project stock)


<!-- Page 312 -->

313
6.4 Initial Entry and Scrapping
Some of these movement types don’t support all of the special stocks or the app is not 
enabled to do so. The app only offers the allowed combinations. The online help of the 
app, which is accessible via the question mark in the upper-right corner, provides the 
most up-to-date overview and can be checked for more details about the allowed com-
binations.
6.4.2    Post Goods Movement
To post a scrapping with the Post Goods Movement app, you must be aware of the 
required movement type. In the entry screen of the Post Goods Movement app, shown 
in Figure 6.59, enter the movement type in the GI scrapping field (“551”, in our example).
Figure 6.59  Entering the Movement Type
Press (Enter) to arrive at the screen shown in Figure 6.60. Here, you can enter the Mate-
rial and plant information.
Figure 6.60  Material Information
Next, click the Where tab to arrive at the screen displaying the plant information shown 
in Figure 6.61. Enter the Plant, Storage Location, and quantity in the Quantity tab, and 
post your scrapping by clicking Post (not shown).
Figure 6.61  Plant Information


<!-- Page 313 -->

6 Core Inventory Management
314
6.5    Reversals
If a material document must be reversed, you can choose between the native Material 
Documents Overview app in SAP Fiori and the Post Goods Movement web-based SAP 
GUI app. We’ll discuss both applications in this section.
6.5.1    Reversals within the Material Document Object Page
In the Material Documents Overview app in SAP Fiori, you can reverse the whole mate-
rial document or even just single material document items.
To do so, select a material document and navigate to the material document object page 
(refer to Section 6.1.3 for details). In the header information, the material document 
item status is shown as described in Section 6.1.3 (refer to Figure 6.7).
In the header of the material document object page, the Reverse action (upper-right cor-
ner, not shown) is provided. Click the Reverse button, and a popup is shown asking you 
to select the reversed material document items. Enter the Posting Date and an Addi-
tional Note, if necessary (see Figure 6.62).
Figure 6.62  Material Document Reverse Popup
6.5.2    Partial Material Document Reversal
In the Post Goods Movement web-based SAP GUI app, a material document or its items 
can be reversed by selecting the material document items in the table view after the 
material document is selected. To access the table view shown in Figure 6.63, choose 
Cancellation in the dropdown, and enter the related material document. Select the line 
with the material you’d like to reverse, and then click the Post button.


<!-- Page 314 -->

315
6.6 Physical Inventory
Figure 6.63  Reversal of a Material Document
6.6    Physical Inventory
Inventory management is one of the essential building blocks of a company’s business, 
especially regarding the current stock situation. Goods kept in stock reflect an essential 
part of a company’s possessions. Therefore, it’s crucial that the overview of the current 
stock figures is always up to date so that business decisions are based on current and 
accurate stock figures. Along with stock figures, the financial impact of the stock (mean-
ing the stock value) must also be accurate. In the daily business of warehouse tasks in 
inventory management, the stock information might deviate from the real stock fig-
ures for many reasons. For instance, a material might have exceeded its total shelf life 
or might be damaged due to breakage. If the real stock figures deviate from the figures 
present in the system, all dependent business processes are using inaccurate stock fig-
ures (MRP, available-to-promise [ATP], etc.). Therefore, maintaining the most accurate 
stock figures in the system is crucial, and, of course, legal reasons might also drive dif-
ferent physical inventory processes.
In SAP S/4HANA, the following different physical inventory process flavors are sup-
ported:
▪Periodic inventory
Generally, periodic inventory is done once a year (i.e., end of the year or business 
year). This variant is chosen by most companies.
▪Continuous inventory
Continuous inventory is commonly used in relationship with warehouse manage-
ment systems, and the counting is carried out at different times in the course of the 
business year.
▪Cycle counting
During cycle counting, inventory materials are counted in periodic cycles based on 
the classification of the cycle counting indicator, which we introduced in Chapter 3, 
Section 3.1.3.
▪Sampling
The sampling inventory is a subset of the cycle counting inventory process and takes 
a considerable amount and a number of kinds of companies’ materials into account. 
The rest of the materials aren’t counted, but the result of the counted ones is extrap-
olated to those materials.
In this section, we’ll discuss the physical inventory process steps for these approaches 
and walk through each in detail with their corresponding apps.


<!-- Page 315 -->

6 Core Inventory Management
316
6.6.1    Physical Inventory Phases
For all these different physical inventory approaches, similar main phases have to be 
performed to get the stock figures checked and updated, as shown in Figure 6.64.
Figure 6.64  Physical Inventory Process Steps
This rough overview is given because often these different phases are also reflected in 
the user setup of the SAP system to distinguish the end users who are allowed to count 
and post the differences, for instance, due to legal reasons.
In the preparation phase, a decision must be made regarding which materials will be 
counted for which plant and storage location. Overall, physical inventory can be per-
formed for the following stock types (see Chapter 2, Section 2.1):
▪01 – Unrestricted-use stock
▪02 – Quality inspection stock
▪03 – Return stock (without special stock types)
▪04 – Stock in transfer at storage location level (without special stock types)
▪05 – Stock transfer stock at plant level
▪06 – Stock in transit
▪07 – Blocked stock
▪08 – Restricted stock
▪09 – Tied empties stock (without special stock types)
▪10 – Valuated goods receipt blocked stock
For the different physical inventory process steps, certain apps are available. In the fol-
lowing sections, we’ll focus in more detail on the available apps for physical inventory 
in inventory management. Let’s start with a high-level look at all available physical 
inventory applications:
▪Prepare phase
– Create Physical Inventory Documents (F3197)
– Change Physical Inventory Document (MI02)
▪Count phase
– Manage Physical Inventory Count (F5430)
Prepare
• Create physical inventory 
   document
• Lock material posting
• Print physical inventory 
   document
Evaluate
• Record count results 
   in the system
• Initiate recount
• Post differences
Count
• Count
• Note results


<!-- Page 316 -->

317
6.6 Physical Inventory
▪Evaluate phase
– Manage Physical Inventory Documents (F0379A)
– Manage Physical Inventory Item List (F8643)
In addition, some shortcuts are available to combine different process steps:
▪Posting the count result without reference to the physical inventory document
The physical inventory document is implicitly created when the count result is 
posted.
▪Posting stock differences without reference to the physical inventory document
The physical inventory document and count result are implicitly created when the 
stock difference is posted.
▪Posting counting and stock differences in one step
The stock differences are directly posted when the count result is entered in one step.
The first two steps can be performed with the Enter and Post PI Count without Docu-
ment web-based SAP GUI application (Transaction MI10, business role SAP_BR_INVEN-
TORY_MANAGER).
In Chapter 3, Section 3.1.3, we already introduced the related settings for physical inven-
tory that are used for entering count results and posting differences.
6.6.2    Create Physical Inventory Documents
The Create Physical Inventory Documents app (F3197) provides a filter bar to select the 
related materials for which a physical inventory document will be created, as shown in 
Figure 6.65. In addition, a filter for a date-dependent selection when the last count of a 
material happened is provided. Further filter criteria, such as adjustment values of 
counts or quantities, can be added to the filter bar via the gear icon.
Figure 6.65  Filter Bar for Physical Inventory
Select your filters, and then click the Go button to access the results list, as shown in 
Figure 6.66. The results list outlines the material-related information, and again the 
table columns can be adjusted to your needs by using the gear icon at the top-right cor-
ner of the table.


<!-- Page 317 -->

6 Core Inventory Management
318
Figure 6.66  Results Table
Clicking on one result line takes you to a details page for the selected material, as shown 
in Figure 6.67.
Figure 6.67  Details Page: Header Data
The details page contains two different tabs. General Information outlines inventory 
and material master data, as shown in Figure 6.68.
Figure 6.68  Details Page: General Information Tab
The Key Figures tab outlines the physical inventory information, such as adjustments 
to count results or quantities in the past 12 months, as shown in Figure 6.69.
Figure 6.69  Details Page: Key Figures Tab


<!-- Page 318 -->

319
6.6 Physical Inventory
After the decision is made to perform a count for a certain material, you can create a 
physical inventory document. To do so, click the related Create Physical Inventory Doc-
uments button (bottom-right corner of results screen, not shown), and the Create Phys-
ical Inventory Documents screen will appear, as shown in Figure 6.70.
All physical inventory documents are split by plant and storage location as a default. In 
addition, the given situation might require a more detailed split of the physical inven-
tory documents. The SAP Fiori app supports more detailed splitting on three different 
layers from which you can choose in the Split Documents by dropdown:
▪Storage Bin
▪Material
▪Material Group
▪None
Enter your maximum number of items and the related date information, as shown in 
Figure 6.70.
Figure 6.70  Creating a New Physical Inventory Document
In addition, additional header data for the physical inventory documents can be set up, 
as shown in Figure 6.71.
The Additional Header Data area contains two important flags. The Set Posting Block
indicator prevents (once set) further material movements for the given material until 
the physical inventory count is completed. Something similar holds true for the Freeze
Book Inventory indicator, which prevents an incorrect book inventory balance during 
the counting process if, for instance, goods receipts are still entered into the system. If 
this indicator is set, the book inventory balance is stored for this physical inventory 
document so that after entering the count results, any changes during the count can be 
compared. This might be relevant if the count result isn’t entered into the system in a 
timely manner.


<!-- Page 319 -->

6 Core Inventory Management
320
Figure 6.71  Header Data of the Physical Inventory Document
In SAP S/4HANA Cloud Public Edition, the Create Physical Inventory app was enhanced 
with a scheduling feature in addition to the creation of physical inventory documents. 
Scheduling a job for creation of physical inventory documents prevents a high system 
load and runtime in the dialog mode. By scheduling a background job, the creation can 
happen asynchronously in the background.
In the footer bar of the app, an additional button for scheduling the creation of physical 
inventory documents was added, as shown in Figure 6.72.
Figure 6.72  Create or Schedule Button
Clicking the Schedule Physical Inventory Document Creation button opens the screen 
shown in Figure 6.73, where you can decide how the physical inventory documents shall 
be split and sorted. In addition, you can define the number of items per document and 
the Planned Count Date.
Figure 6.73  Schedule Creation Popup Screen


<!-- Page 320 -->

321
6.6 Physical Inventory
Under Additional Header Data, you can select the Set Posting Block or Freeze Book 
Inventory checkboxes and under Printing Options, you can select and define the related 
output schedule (not shown).
Click the Schedule button, and you’ll see the successfully scheduled application job, as 
shown in Figure 6.74.
Figure 6.74  Application Job Scheduled
Via the Application Job link in the success popup, you can navigate to the application 
job for checking the details, as shown in Figure 6.75. The application job log results con-
tain details about the creation job.
Figure 6.75  Job Log Results
The Job Scheduling and Mass Processing – Physical Inventory app (F4450) also provides 
capabilities to create jobs for the creation of physical inventory documents. After start-
ing the app, you can filter for given jobs to analyze their results or create a new job by 
clicking the Create button, as shown in Figure 6.76.
Figure 6.76  Filter Bar and Create Button in Job Scheduling and Mass Processing – Physical 
Inventory App
You’ll then be guided by the system to define the related parameters, as shown in Figure 
6.77.


<!-- Page 321 -->

6 Core Inventory Management
322
Figure 6.77  Definition of Process Type During Job Creation
Most important is to edit the Selection Criteria to define the details of the physical inven-
tory documents to be created like Material and Stock Types, as shown in Figure 6.78.
Figure 6.78  Selection Criteria During Job Creation
Once you have entered all required parameters and selection criteria, click the Schedule
button in the footer bar (not shown), and the job gets created.
6.6.3    Manage Physical Inventory Count
After the inventory is counted based on the physical inventory document, the count 
result must be entered into the system. This can be done with the Manage Physical 
Inventory Count app (F5430) with business role SAP_BR_WAREHOUSE_CLERK.
In this app, as shown in Figure 6.79, you can enter count results or change them. In addi-
tion, ad hoc counting is supported by creating a physical inventory document and 
entering the count result in one step.


<!-- Page 322 -->

323
6.6 Physical Inventory
Figure 6.79  Manage Physical Inventory Count App with Available Documents
Once you enter your filter criteria (in our example, part of a Physical Inventory Docu-
ment number), you can select the related item and navigate into the detail screen of the 
same by clicking the arrow icon on the right-hand side, arriving at the screen shown in 
Figure 6.80.
Figure 6.80  Detail Screen with Counting Data
In the detail screen, the counting result can be entered in the Counted Quantity in Entry 
U… field, as shown in Figure 6.81, once the Edit button is clicked.
 
Note
The app is implemented on an ABAP RESTful application programming model business 
object and provides a draft mode, which means once you entered your counted quan-
tity, a draft version of your input is automatically saved for further processing. A related 
info message is outlined in the footer bar of the app: Draft updated.


<!-- Page 323 -->

6 Core Inventory Management
324
Figure 6.81  Detail Screen with Counted Quantity
The app also provides an Excel-based download/upload feature (see Figure 6.82), which 
allows you to upload your count result via an Excel spreadsheet. This feature might be 
very helpful when you have a lot of items to be counted, and it enables you to print out 
the Excel sheet for your counting activities.
Figure 6.82  Count Result Upload Screen
Once you enter your counted quantities or upload them, you can click the Save button 
in the footer bar to save your draft version accordingly (not shown). After saving, the 
status of the item gets updated to Counted, as shown in Figure 6.83. The toggle button 
on top of the item table allows you to select the items based on their counting status. 
This feature is helpful if you have multiple items to be counted and want to get a quick 
view by counting status.
After the count results are entered, you can proceed with processing the results, which 
we’ll focus on in the next chapter.
 
Note
If a count result has to be changed afterward (before posting differences), the Manage 
Physical Inventory Documents app can be used to trigger a recount.


<!-- Page 324 -->

325
6.6 Physical Inventory
Figure 6.83  Status Updated to Counted
6.6.4    Process Physical Inventory Count Results
The count results can be further processed with the Manage Physical Inventory Docu-
ments app (F0379A) by selecting the relevant Physical Inventory Document you want to 
process. In our example (see Figure 6.84), the document number is entered. In the table, 
the Counting Progress is outlined as information to the end user to check if the counting 
is still in progress or already entered into the system.
Figure 6.84  Physical Inventory Document with Count Progress Indicator
You can now navigate into the detail screen by clicking the arrow icon on the right-hand 
side to proceed with processing, as shown in Figure 6.85.
Figure 6.85  Physical Inventory Document with Post Action


<!-- Page 325 -->

6 Core Inventory Management
326
In the Items table, you can now select the items which you want to process. If the item 
is counted, you can see the difference quantity and value before you decide to post the 
difference (via the Post button) or would like to initiate a recount (via the Recount but-
ton). In the General Information section, as shown in Figure 6.86, some additional infor-
mation is outlined that might support your decision.
Figure 6.86  General Information of Physical Inventory Item
If you click the Post button, a popup screen (see Figure 6.87) comes up which allows you 
to enter the posting date and a reason for posting the differences. After clicking the Post
button in the popup, a material document gets created with the related quantity differ-
ences to correct the stock accordingly.
Figure 6.87  Posting Popup
In case you decide for a recount and click the Recount button instead of posting the dif-
ferences, a new physical inventory document would be created in order to reinitiate the 
counting.
6.6.5    Manage Physical Inventory Item List
If you want to gain a list of inventory differences and involved materials, you can use 
the Manage Physical Inventory Item List app (F8634), which is available in SAP S/4HANA 
Cloud Public Edition.
The app offers a filter bar (see Figure 6.88) where you can enter your document number 
or a different quantity for which you would like to select the related physical inventory 
documents.


<!-- Page 326 -->

327
6.6 Physical Inventory
Figure 6.88  Selected Physical Inventory Documents
Once the documents are selected, you can open a side panel by clicking on the arrow 
icon on the right-hand side, which will open a side panel with detailed information, as 
shown in Figure 6.89.
Figure 6.89  Side Panel with Process Data and Count Results
In this side panel, you find the Process Data like the user information of who counted 
the item. If a Recount Document was created, it’s also shown. In our example, you can 
see that a Recount Document was created. By clicking on the document number, you 
can navigate to the related Recount Document. In addition, the Count Results are out-
lined, including the difference quantity and value information for your analysis.


<!-- Page 327 -->

6 Core Inventory Management
328
6.7    Cross-Topics
The following sections outline the capabilities of inventory management applications 
regarding functional cross-topics, which were introduced in Chapter 3, Section 3.2.
6.7.1    Batches
The handling of batches can be enabled in all related inventory management applica-
tions. During goods receipt posting, you can select the related batch the stock shall be 
posted to. You can select given batches via search help or let the system auto create a 
new batch. As shown in Figure 6.90, the Post Goods Receipt for Purchasing Document 
app provides a column in the item table to outline the batch information per item once 
a purchase order is selected and the items are displayed.
Figure 6.90  Goods Receipt App Items with Batch Input Field
Also, during stock analysis, the analytical applications provide related filter criteria to 
select stock information to select only batches which are of interest, and the result set 
can be structured to outline stock information on the batch level. The analytical appli-
cations also provide batch filter criteria so that the end user can narrow down the result 
(i.e., to batches that are of interest). An example is shown using the Stock – Multiple 
Materials app (see Figure 6.91), where you can see the related Batch in a separate column 
of the result table. If you only want to select a certain batch or set of batches, an appro-
priate filter criterion based on the batch filter could be set.
Detailed batch information can be accessed by clicking the batch number. In most SAP 
Fiori apps, there is a sematic object-based annotation in place so that the navigation tar-
gets the related business object. In our example, you could click on the batch in the 
result table, for instance batch 1138, to navigate to the batch object page to check for 
batch master data details (e.g., shelf-life information), as shown in Figure 6.92.
With the Transfer Stock – Cross Plant app, it’s possible to post stock from one batch to 
another. Figure 6.93 shows the Issuing Batch and Receiving Batch fields have been 
entered, which means that in the related popup screen you can enter your posting 
details like storage location or quantity.


<!-- Page 328 -->

329
6.7 Cross-Topics
Figure 6.91  Result Set in Stock – Multiple Materials App with Batch Information
Figure 6.92  Display Batch Information After Forward Navigation
Figure 6.93  Transfer Stock – Cross Plant Posting Information


<!-- Page 329 -->

6 Core Inventory Management
330
6.7.2    Serial Numbers
Serial numbers are also integrated into inventory management applications and can be 
assigned during posting of goods movements. Picking up materials during goods 
receipt processing is one use case where you can assign serial numbers to the goods 
received. In the item detail screen of the Post Goods Receipt for Purchasing Document 
app, you see a Serial Numbers section, as shown in Figure 6.94. In this section, you can 
enter your serial numbers manually, select a serial number via the given search help, or 
let the system automatically create the serial number during posting of the goods 
movement. A check is automatically performed to ensure that the number of assigned 
serial numbers matches the entered quantity. If the serial numbers don’t match, an 
error message is shown, as shown in Figure 6.94.
Figure 6.94  Serial Number Selection Screen During Goods Receipt
By clicking an item in the Material column (see Figure 6.95), you navigate to the Display 
Serial Numbers app, where you can check the available serial numbers per material. The 
same holds true for the Display Serialized Stock Quantities app to check the assigned 
stock level. In the Display Serialized Stock Quantities app, you can check the available 
stock per material and serial number.
Figure 6.95  Serialized Stock Quantities
Via the arrow icons on the right-hand side, you can navigate to the Manage Material 
Serial Numbers app (only in SAP S/4HANA Cloud Public Edition). In this app, as shown 
in Figure 6.96, you can click the Create button to create a new serial number, or click the 
Mass Create button to create multiple serial numbers.


<!-- Page 330 -->

331
6.8 Real-World Scenarios and Best Practices
Figure 6.96  Manage Material Serial Numbers App
6.7.3    Handling Units
Handling units are logistics units that group several individual materials together. The 
aim of handling units is to simplify the logistics handling and gain process efficiency by 
packing related materials into the same handling unit (i.e., a pallet). In inventory man-
agement, handling units optimize the overview of how materials are packed and stored 
including their stock level.
The difference compared to batches or serial numbers is that a handling unit can’t be 
changed through inventory management stock moving processes; it’s just used as a 
separate entity. Handling units are like a given attribute for inventory management.
In the Post Goods Movement app (Transaction MIGO), the Warehouse Management tab 
is displayed if a related handling unit managed material is selected, as shown in Figure 
6.97. The inventory management apps don’t offer such a screen as of the time of writing 
(summer 2025).
Figure 6.97  Handling Units in Warehouse Management Tab
6.8    Real-World Scenarios and Best Practices
In this section, we’ll explore some real-world and best practice scenarios. These scenar-
ios serve as hands-on advice for how to best utilize the given features in inventory man-
agement.
6.8.1    Scanning Barcodes to Speed Up Inventory Management
Barcode scanning is one of the recent enhancements done in inventory management 
to simplify and optimize daily tasks. It speeds up the data entry and reduces the amount


<!-- Page 331 -->

6 Core Inventory Management
332
of erroneous data entries. Inventory management apps are technically equipped with 
a barcode scanning library, which is also increasingly used by apps outside of inventory 
management. This technical architecture setup offers a commonly used interaction 
flow to the end user. In addition, the settings made for barcode scanning are available 
in all the apps that are currently utilizing the scanning library.
Barcode scanning in inventory management can be set up to serve composite barcodes 
like GS1 standard or simple barcodes that just contain a singular data point like a mate-
rial number. The settings of barcode scanning are available in SAP S/4HANA as an IMG 
activity and in SAP S/4HANA Cloud as a self-service configuration UI (SSCUI). Refer to 
Chapter 3, Section 3.3.4, for more details about the barcode scanning settings.
 
Note
The following list of supported applications and their feature level varies between SAP
S/4HANA Cloud Public Edition and SAP S/4HANA Cloud Private Edition (or on-premise). 
The broadest amount of support features and applications are available in SAP S/4HANA 
Cloud Public Edition.
After outlining a first example with a simple barcode in Chapter 5, Section 5.7.3, we now 
want to add another example based on a GS1 barcode. The Transfer Stock – In-Plant app
provides scanning feature support. In case you did the Customizing setup for compos-
ite barcodes accordingly (see Chapter 3, Section 3.3.4), you might utilize a GS1 barcode 
for automated input of required information to the app. After starting the app, you scan 
the barcode to enter the material number automatically.
Once you have selected the start and target stock in the Material by Storage Location
tab, the related popup to enter more required details for posting the goods movement 
is shown in Figure 6.98. In the footer of the popup, a Scan button is present to scan the 
GS1 barcode a second time to automatically prefill the details like quantity, shelf-life 
date, or even serial numbers.
Figure 6.98  Scan Button in Posting Screen of Transfer Stock – In-Plant


<!-- Page 332 -->

333
6.8 Real-World Scenarios and Best Practices
Composite barcodes especially provide valuable process efficiency and data correctness 
by containing several mandatory attributes, which can simply be entered by scanning 
the barcode.
The following apps for core inventory management currently support both types of 
barcodes (simple and composite):
▪Post Goods Receipt for Purchasing Document
▪Post Goods Receipt for Production Order
▪Post Goods Receipt for Process Order
▪Post Goods Receipt for Inbound Delivery
▪Post Subsequent Adjustment
▪Stock – Single Material
▪Transfer Stock – In-Plant
▪Manage Stock
6.8.2    Managing Product Lifecycle State with Split Valuation
Split valuation allows you to differentiate the value of a material by different criteria in 
the same valuation area throughout the whole lifecycle of a product/material.
On prominent example of differentiation is split valuation on batch level. Valuation 
category X represents the batch valuation differentiator. In standard scope, the follow-
ing valuation categories are included:
▪B: Procurement type
▪H: Country of origin
▪X: Batch
The valuation category is assigned to a material in the material master record. In rela-
tion to the valuation category, the valuation types need to be defined. For example, val-
uation category B contains two value types: Internal and External.
Valuation category X is a special case and doesn’t own separate split valuation types. In 
case of valuation category X, the batch is the valuation differentiator. By utilizing the 
batch as valuation type, the valuation can be easily performed on the batch level for a 
certain material.
During goods receipt, a new batch can automatically be created by the app. This can eas-
ily be achieved by keeping the input field for the batch number empty, as shown in 
Figure 6.99.
In Chapter 3, Section 3.2.4, more details about the setup of split valuation were provided.


<!-- Page 333 -->

6 Core Inventory Management
334
Figure 6.99  Batch Auto Create During Goods Receipt Processing
6.8.3    Converting Materials into Different Materials
Some special cases require changing the material number to a new one. In these cases, 
movement type 309 can be used via the Post Goods Movement app (see Figure 6.100) 
to post stock from one given material to another.
For instance, a chemical process might change a given material over time so that it no 
longer fits the given material and its setup in the material master. Therefore, you might 
want to post the stock to a better fitting material. The prerequisite is that both materials 
(old and new) have the same base unit of measure.
Figure 6.100  Post Goods Movement App with Movement Type 309
6.8.4    Fine-Tuning Inventory with Custom Movement Types
A movement type identifies every goods movement with a three-digit ID and shapes 
the attributes of the goods movement (e.g., if it’s a transfer posting or a goods receipt). 
In Chapter 3, Section 3.1.3, some details were already shared about movement type


<!-- Page 334 -->

335
6.8 Real-World Scenarios and Best Practices
configuration. Besides the predelivered movement types and their settings, sometimes 
adjustments and fine-tuning are required. Therefore, the system provides a copy fea-
ture for predelivered movement types. In SAP S/4HANA Cloud Private Edition, the cop-
ied movement types can be adjusted in a broader manner. In SAP S/4HANA Cloud 
Public Edition, a movement type can be copied and the short text or help text can be 
adjusted accordingly. These copied movement types can then be used (i.e., for differen-
tiation in control, like different reason code handling or in setting up a related account 
modification). This enables you to differentiate the accounts during goods movements 
based on different movement types according to your needs.
As shown in Figure 6.101, you can adjust the behavior of goods movements based on 
settings related to movement types. Each of these Configuration Steps offers a certain 
setting that is assigned to a movement type.
Figure 6.101  List of Movement Type Related Settings in SAP S/4HANA Cloud Public Edition, 
Including Account Modification
 
Note
Chapter 3, Section 3.1.4 provides details about account determination. Based on the cop-
ied movement type, a more fine-tuned account modification could be performed.
After the Copy Movement Type configuration activity is started, you’ll see a list of avail-
able and predelivered movement types, as shown in Figure 6.102.


<!-- Page 335 -->

6 Core Inventory Management
336
Figure 6.102  Customizing Activity Copy of Movement Type
In the list, you can mark on entry with the checkbox left of the movement type code. 
After you have selected one entry, you can click the Copy icon.
In the detail screen, as shown in Figure 6.103, you can enter the new movement type 
code you want to create.
Figure 6.103  Copy of Movement Type Screen to Enter the New Movement Type Code
Your individual movement type code must start with one of the following characters: 
9, X, Y, or Z. All other characters are a protected namespace by SAP. Once you enter your 
new movement type code, you click the Apply button in the footer bar to proceed (not 
shown).
After you have clicked the Apply button, you’ll be navigated back to the list of move-
ment types, and your new custom movement type will be part of that list, as shown in 
Figure 6.104.


<!-- Page 336 -->

337
6.8 Real-World Scenarios and Best Practices
Figure 6.104  List of Movement Types, Including Custom Movement Types
Now, you can activate the checkbox left of your new movement type code and double-
click the activity Movement Type texts from the navigation tree on the left-hand side, 
as shown in Figure 6.105.
Figure 6.105  Change of Movement Type Text
In this screen, you can now change the Movement Type Text according to your needs 
and the language which is required. After you have made your changes, you need to 
click the Apply button in the footer bar to take over your changes (not shown).
Having created this movement type, you can now make use of it in the Customizing 
activities listed earlier.


<!-- Page 337 -->

6 Core Inventory Management
338
6.9    What’s Ahead for Core Inventory?
Recently, some enhancements to the SAP Fiori-based core inventory management pro-
cesses were released. For instance, more granular support for batches in the Manage 
Stock, Transfer Stock – In-Plant and Transfer Stock – Cross Plant apps in SAP Fiori was 
introduced for better usability. In addition, support for goods issue posting in Manage 
Stock was also introduced. As of the time of writing (summer 2025), there are some fea-
tures that are lacking and worthwhile enhancements that could enrich the native SAP 
Fiori apps for the core inventory processes:
▪Field control
Configuration capability to control the fields that are available on the UI (that is, to 
set available fields to optional or mandatory in the goods receipt apps).
▪Initial load
Enablement of initial loading for special stock types (some were added in recent 
deliveries). 
▪Scrapping
Enablement of scrapping with account assignments in addition to cost centers for 
special stocks.
In addition, AI capabilities to support Inventory Management processes might be 
worthwhile in the future.
6.10    Summary
This chapter outlined the core inventory management processes and their representa-
tion as native SAP Fiori apps or web-based SAP GUI apps. As of now, web-based SAP GUI 
apps are still necessary due to some missing features of native SAP Fiori apps. Increased 
end user usability and modern UIs will cause the usage of native SAP Fiori apps to 
increase quickly, depending on further feature enhancements.
We walked through stock identification at the beginning of this chapter to outline how 
stock figures can be observed and analyzed, and then we touched on a basic activity of 
inventory with regards to stock transfer processes. In addition, some special areas 
reflecting initial stock entries and scrapping were described in a separate section. We 
also covered reversals and the physical inventory process that guarantees the financial 
accuracy of the available stock situation.
Now that we’ve laid the foundation for the core inventory processes, we’ll outline pro-
duction execution in the next chapter based on these fundamentals.
