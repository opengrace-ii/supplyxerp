# Chapter 7 Production Execution


<!-- Page 338 -->

339
Chapter 7
Production Execution
In this chapter, we’ll execute our planning process using the recom-
mended SAP Fiori apps. We’ll start with reservations and continue with 
the entire production process, from scheduling to confirmation, step by 
step, and then take a look at monitoring and Kanban options.
This chapter describes all processes during production planning execution. This is one 
follow-up step from Chapter 4, in which we discussed planning and adjusting inventory, 
covering the processing of internal requirements, namely production orders.
As explained in Chapter 2, SAP S/4HANA entails role templates that help customers 
quickly enable the end user in effectively using the SAP Fiori apps. This chapter deals 
with the production supervisor/operator. As this book covers inventory management, 
it doesn’t distinguish between production supervisor and operator. The production 
supervisor is in charge of the work centers where production occurs, ensuring that 
orders are completed on time and are of good quality. Key tasks include working with 
the production operator, ensuring production processes are followed correctly, and 
machine maintenance. When a maintenance problem occurs or even a machine break-
down, it’s the production supervisor’s responsibility to escalate the problem, if needed. 
Production operators, on the other hand, are on the shop floor. They operate machines 
and perform the manual labor, which may necessitate a high level of skill or may be 
somewhat simple, depending on the production process.
This chapter describes how to monitor the lifecycle of a production order beginning 
with its execution, tracking, and documenting deviations, until its final confirmation. 
The process goes as follows, paired with the associated SAP Fiori apps:
1. Schedule production execution
– Capacity Scheduling Table (F3770)
– Monitor Work Center Schedules (F3951)
2. Monitor production execution
– Monitor Production Order/Process Order (F0266)
– Manage Production Order (F2336)
– Manage Production Operations (F2335)


<!-- Page 339 -->

7 Production Execution
340
3. Confirm production execution
– Confirm Production Operation (F3069)
– Create Goods Receipt for the Production Order (F3110)
Naturally, the chapter will also cover some supplementary processes, such as Kanban, 
reservation handling, and key performance indicators (KPIs) useful in production plan-
ning execution.
7.1    Working with Reservations
Reservations can be used to prepare a goods issue of a particular material at a defined 
point in time for a certain purpose. Reservations can be created manually or automati-
cally, as shown in Figure 7.1. Automatically created reservations can’t be edited manu-
ally, and they are based on orders, work breakdown structure (WBS) elements, networks, 
and stock transfers. Reservations don’t decrease the unrestricted stock displayed in the 
various SAP Fiori apps (see Chapter 6), but they are considered during material require-
ments planning (MRP) (see Chapter 4).
Although it’s also possible to use reservations to plan the goods receipt process, this 
normally isn’t required because purchase orders and production orders contain all the 
required information anyway.
Figure 7.1  Business Processes Embedding Reservations
In this section, we’ll walk through the automatic and manual creation of reservations 
and show how to display your reservation list.
7.1.1    Automatic Creation of Reservations
MRP runs can create stock transfer reservations at the issuing plant as part of a stock 
transfer process to cover open demands in a different location.
Reservations are also created/changed automatically if the leading document (order, 
network, WBS element) is created/changed.
Which material?
Which quantity?
When (requirement date)?
Where (plant/storage location)?
Which recipient?
Why (movement type)?
Which priority?
Manual
Reservation
Automatically Created
Reservation
• Based on orders,
   WBS elements, and
   networks
• Based on stock
   transfers
Reservation Document


<!-- Page 340 -->

341
7.1 Working with Reservations
7.1.2    Manual Reservation Management
The Manage Manual Reservations app (F4839) in SAP Fiori allows you to manually create 
a reservation. On the initial screen in Figure 7.2, you enter Base Date, Movement Type, 
and Plant, and then you proceed to the details screen by clicking the Create button.
Figure 7.2  Creating a Reservation: Initial Screen
In the details page shown in Figure 7.3, you enter the reservation details, such as various 
account assignment fields G/L Account, Goods Recipient, Cost Center, Material, Quan-
tity, and Storage Location. You save your input by clicking the Post button (not shown).
Figure 7.3  Creating a Reservation: Details
After you’ve created your reservation, you can view it in the Manage Manual Reserva-
tion app shown in Figure 7.4. This is a mass maintenance tool for execution changes on 
reservations, such as Copy Reservation or Delete Reservation.


<!-- Page 341 -->

7 Production Execution
342
Figure 7.4  Viewing a Reservation
7.1.3    Manage Reservation Items
In addition to the Manage Manual Reservations app, the Manage Reservation Items app
(F5601) is available to check and process reservation items. The app supports viewing/
checking, editing, copying, or deleting reservation items through the various buttons, 
as shown in Figure 7.5. You can also create new reservations (similar to the Manage Man-
ual Reservation app described in the previous section). Editing is possible for manual 
reservations or reservations created by MRP. Reservations that are automatically cre-
ated from dependent processes can’t be edited.
Figure 7.5  List with Reservation Items
In the Me Area, you can define the Goods Recipient, Unloading Point, and Recipient 
Location under Reservation Settings, as shown in Figure 7.6.
Figure 7.6  Reservation Settings


<!-- Page 342 -->

343
7.1 Working with Reservations
After completing the related selection, you can select the items for which you want to 
perform a goods movement. Only movement types 201 and 261 are supported, as 
demonstrated by the error message in Figure 7.7.
Figure 7.7  Supported Movement Types 201 and 261 Error Message
If you select a reservation item and click the Edit button, you’ll be forwarded to the Man-
age Manual Reservation app in edit mode, as shown in Figure 7.8.
Figure 7.8  Edit Mode of Reservation
Figure 7.9 shows an example Process Flow for the reservation, which you can view in the 
Reservation Item tab.
Figure 7.9  Process Flow of Reservation


<!-- Page 343 -->

7 Production Execution
344
By clicking the Create Goods Movement button (refer to Figure 7.5), you’ll be navigated 
to the Manage Material Document for Reservation app (F7279) to create a material doc-
ument with reference to the chosen reservation, as shown in Figure 7.10.
Figure 7.10  Manage Material Document for Reservation App
This app is based on the ABAP RESTful application programming model and provides a 
draft feature before finally posting the related material document. The material docu-
ment draft can be discarded via the Discard Draft button in the footer bar. This app is 
only accessible via the Manage Reservation Items app.
7.2    Scheduling and Manufacturing Execution
In this section, we’ll cover the entire manufacturing execution process, beginning with 
production scheduling. We’ll then discuss how to monitor various execution steps, 
briefly introduce change management, and finally cover the confirmation step.
7.2.1    Capacity Scheduling Table
The former Schedule Production app (F3770) has been renamed to Capacity Scheduling 
Table and allows you to schedule orders on bottleneck or pacemaker work centers (work 
centers that are critical for the production scheduling) based on the production line set-
tings in the material master record selected within one Horizon (mandatory).
Within the app settings, you’ll need to define your Area of Responsibility and your 
Industry Type (Discrete or Process).


<!-- Page 344 -->

345
7.2 Scheduling and Manufacturing Execution
 
Note
You need to maintain the correct production line in the MRP4 view of the material mas-
ter record to be able to schedule a production version.
You also need to maintain finite capacity planning at the work center to see each order’s 
capacity requirements.
You can access the list of production operations by clicking the Go button, as shown in 
Figure 7.11.
Figure 7.11  Simple List with Production Operations
The Set Strategy button at the top of the screen brings you to the screen shown in Figure 
7.12, which enables you to personalize the planning parameters with the following 
options:
▪Planning Mode: You can select the Bucket planning mode to display the capacity view 
in Figure 7.13 as a table format with one column per day. You can use the Sequence
planning mode to display the capacity in time continuous format (not shown).
▪Scheduling Control: You can use a Finite or Infinite scheduling strategy.
▪Direction: Forward scheduling considers the start date of the order, and Backward
considers the end date of the order.
Figure 7.12  Set Strategy


<!-- Page 345 -->

7 Production Execution
346
The Dispatch and Deallocate buttons allow you to change all selected production oper-
ations shown in Figure 7.11.
To access the details screen shown in Figure 7.13, click the arrow icon of a selected item. 
Here, you can do the following:
▪Switch the production version, if applicable, by choosing from the Assign column.
▪Dispatch an operation using the Dispatch button.
▪Deallocate an operation using the Deallocate button in the top right-hand corner.
▪Edit operation details in the Available Sources of Supply table (see Figure 7.14).
Figure 7.13  Details of Selected Production Operations in a Flexible Column Layout
In our example shown in Figure 7.14, you can select the Scheduled Operation Start date 
in order to get the related sourcing and scheduling date shown, which you can dispatch 
accordingly by clicking the Dispatch button.
Figure 7.14  Editing Operation Details
7.2.2    Capacity Scheduling Board
The former Monitor Work Center Schedules app (F3951) was also renamed, in this case, 
to Capacity Scheduling Board. The app allows you to monitor the progress on opera-
tions of selected work centers in your area of responsibility. Thus, you’ll be able to track 
the production execution. You need to fill in the mandatory Evaluation Horizon filter 
to define the time frame to look at in Figure 7.15. On the left side, you’ll see either the


<!-- Page 346 -->

347
7.2 Scheduling and Manufacturing Execution
Pacemaker Work Centers (in our example) or All Work Centers. The operations per work 
center are delineated on a time axis (unit hours) on the right side. The legend button in 
the toolbar explains the different color codes of the chart.
Figure 7.15  Entry Screen with Work Centers and Operations
You can select an operation in the chart and navigate via the Schedule Production but-
ton to the respective SAP Fiori app, as shown in Figure 7.16 (see previous section).
You can select a Work Center from the column on the left side of Figure 7.15 to access a 
quick view. Figure 7.17 shows how quick views help you retrieve additional information 
on the work center to navigate to context-sensitive SAP Fiori apps related to work centers.
Figure 7.16  Navigation to Schedule Production
Figure 7.17  Work Center Quick View


<!-- Page 347 -->

7 Production Execution
348
If you have more than one operation per work center, you can expand the hierarchy on 
the left side, as shown in Figure 7.18. If you select an operation, you see the Operation 
Details in a side panel on the right side.
Figure 7.18  Work Center with Expanded Production Orders
If you select a production order in Figure 7.18 and click the Order Details button (not 
shown), you can see all the Operations of the selected production order and their assign-
ment and schedule in the corresponding work center, as shown in Figure 7.19.
Figure 7.19  Operations per Production Order
7.2.3    Stock Requirements List
The Stock Requirements List app shows the supply and demand situation for each 
material on a very detailed level. After entering Material, MRP Area, and Plant, the data 
is loaded. As shown in Figure 7.20, you can see a list of key information, such as Date, 
MRP element, Receipt/Reqmt, and Available Qty, normally sorted after date.


<!-- Page 348 -->

349
7.2 Scheduling and Manufacturing Execution
Figure 7.20  Stock Requirements List
7.2.4    Display Planned Orders, Production Orders, and Process Orders
This section will guide you through finding and displaying the transactional docu-
ments linked to manufacturing execution. We’ll take a look at both the enterprise 
search option and the available SAP Fiori apps.
Enterprise Search
As explained in Chapter 1, Section 1.4.3, the main SAP S/4HANA business objects can be 
searched for and displayed with the built-in SAP Fiori launchpad enterprise search capa-
bility. This is particularly helpful if the primary intention is to do some basic information 
retrieval with little information to start with. Figure 7.21 shows searching with a produc-
tion order number and the related actions the app offers based on the end user’s role.
Other typical information used for searching includes the material number, material 
short text, or plant. By selecting a business object to search in, you restrict the result set 
to production orders, process orders, or planned orders.
If the information displayed by the enterprise search expanded view (shown in Figure 
7.21) isn’t sufficient, you can go directly to the object page of the production order by 
clicking the Production Order button in the header of the search result entry to see a rich 
set of additional data, as shown in Figure 7.22.


<!-- Page 349 -->

7 Production Execution
350
Figure 7.21  Searching for Production Order
Figure 7.22  Object Page Header: Production Order
The object page header allows direct navigation to the section of interest via multiple 
tabs. For example, you can view the Operations and Components details, as shown in 
Figure 7.23.


<!-- Page 350 -->

351
7.2 Scheduling and Manufacturing Execution
Figure 7.23  Object Page Details: Production Order
SAP Fiori Applications
If enterprise search and object pages don’t contain the applicable information, the Dis-
play Production Order app (shown in Figure 7.24) or the Display Process Order app (shown 
Figure 7.25) can be used to retrieve all data related to the business object in depth.
Figure 7.24  SAP Fiori App: Display Production Order


<!-- Page 351 -->

7 Production Execution
352
Figure 7.25  SAP Fiori App: Display Process Order
7.2.5    Manage Change Requests
If you’ve selected to use Change Requests (see Figure 7.26) in your personal settings, 
changes to external requirements are managed by a change order process involving the 
vendor. A change request can have the statuses New, Requested, and Answered. The 
Manage Change Requests app (F0670) is used to handle this process.
Figure 7.26  Personalization: Activating Change Requests
Four SAP Fiori apps are available to manage change requests. Three are used exclusively 
for each of the aforementioned states, and a fourth one is used to handle all states.
Figure 7.27 shows a change request. If you select Set to Requested, the change request is 
created with status Requested.


<!-- Page 352 -->

353
7.2 Scheduling and Manufacturing Execution
Figure 7.27  Initiating a Change Request for a Purchase Order: Edit Mode
You can enter a note and change the desired attribute. Click the OK button to enact the 
change. To manage this change, you could use either the Manage Change Requests – 
New app or the Manage Change Requests – All app (F0670 and F3406, respectively).
Figure 7.28 shows the Manage Change Request – All app. The worklist contains the ven-
dors on the right side and all change requests of the selected vendor on the left side. You 
can navigate to the details of all open change requests.
Figure 7.28  Worklist of All Change Requests


<!-- Page 353 -->

7 Production Execution
354
Figure 7.29 shows a change request with status New. To create automatic emails to the 
selected vendor of a change request with the status New, select the change request and 
click the Compose Email button. The changed attributes are shown and can be edited by 
clicking the Edit button. You can also click the Set to Requested option, which changes 
the status to Requested. The lower section shows all MRP elements of the Material as a 
table or graphic. All actions can be documented in the Notes section.
Figure 7.30 shows a change request of status Requested. You can record the vendor’s 
response with one of the Pending, Accepted, Rejected, or New Proposal buttons.
Figure 7.29  Change Request with Status New
Figure 7.30  Change Request with Status Requested


<!-- Page 354 -->

355
7.2 Scheduling and Manufacturing Execution
Click the Apply Changes button to automatically update the order if the vendor doesn’t 
reject the changes. With the Discard button, you can close the change request if the ven-
dor rejects any changes. Both actions will close the change request.
7.2.6    Check Material Coverage
The Check Material Coverage app (F0251) allows you to directly check the material cov-
erage of a certain material. When starting the SAP Fiori app, a popup window requires 
you to enter Material and Plant supported by value help, as shown in Figure 7.31.
Figure 7.31  Starting the SAP Fiori App
Subsequently, the Material Coverage app described in Chapter 4, Section 4.7.1 is started.
7.2.7    Monitor Production Orders and Process Orders
The Monitor Production Orders or Process Orders app (new version, F0266B) helps you 
to track all the production or process orders in your area of responsibility, detect critical 
situations, and react to them. Many objects offer quick views for rapid inspections. Start-
ing with a simple requirements list, you can navigate to a worklist for selected items.
Figure 7.32 shows the list with status information per material, such as start and end 
time, delays in operations or missing components, and open quantities. The Status col-
umn contains an aggregated overview. The calculations are based on the selected Short-
age Definition:
▪MRP Standard
Represents standard MRP logic to compare supplies and demands.
▪Stock Days’ Supply
Calculates stock days’ supply to compare available stock with planned demands.
▪Ordered Requirements
Calculates whether the planned receipts will cover the ordered demands.


<!-- Page 355 -->

7 Production Execution
356
▪Ordered Receipts
Calculates whether the ordered receipts will cover the planned demands.
Figure 7.32  Simple List: Monitor Production Orders
After selecting one or more item, click the Manage Orders button in the footer bar (not 
shown) to navigate to the Manage Production Orders (F0273) worklist, as shown in 
Figure 7.33.
Figure 7.33  Worklist: Selected Production Orders with Five Sections per Object Details
Within this worklist, you work on the production orders. The following five sections 
provide additional information to identify and solve any issue:


<!-- Page 356 -->

357
7.2 Scheduling and Manufacturing Execution
▪Stock/Requirements List
You can solve the issue quickly by starting an MRP run from this section (see Figure 
7.33). Another option to solve an issue is to delete the MRP Element. If the MRP run 
can’t solve the issue, and the material is externally procured, click a row with an icon 
to navigate to the Material Shortage screen (see Chapter 4, Section 4.7.1). This section 
offers a graphical display too (not shown).
▪Components
You can identify any missing quantity you want to solve, as shown in Figure 7.34. 
Click the Manage Components button in the footer bar (not shown) to navigate to 
the Monitor Internal Requirements app described in Chapter 4, Section 4.7.8.
Figure 7.34  Components Section with the Manage Components Capability
▪Milestones
You get an overview of all operations, including their timeline and status, as shown 
in Figure 7.35.
▪Material
You can view material-related information, such as Stock Availability, Material, and 
MRP Data, as shown in Figure 7.36.


<!-- Page 357 -->

7 Production Execution
358
Figure 7.35  Milestones Section
Figure 7.36  Material Section with Master Data
▪Production Order
You can see the details of the production order, such Order Type, Order Status, vari-
ous date fields, and Order Quantity (see Figure 7.37).


<!-- Page 358 -->

359
7.2 Scheduling and Manufacturing Execution
The Monitor Process Orders app offers the same capabilities as the Monitor Production 
Orders app.
Figure 7.37  Production Order Section
7.2.8    Manage Production Orders
The Manage Production Orders app (F0273) helps you supervise the progress of produc-
tion by monitoring production order operations and can be reached (as described in the 
previous section) from the Monitor Production Orders app (F0266B). This will enable 
managing production orders from a planning perspective. In case the app should be 
started from a supervisor point of view, the Manage Production Orders app (F2336) 
should be used.
 
Note
Planners have a more technical view, focusing on creating production orders and ensur-
ing material availability. Supervisors have a more strategic point of view and focus on 
corporate goals like material quality and more operational aspects of production as bal-
ancing of teams. The app that you choose should reflect your particular focus.


<!-- Page 359 -->

7 Production Execution
360
If you detect any issues, you can drill down to identify the root cause and take immedi-
ate action to resolve the issue and keep your production process running as smoothly 
as possible. The usage is supported by personalization via Area of Responsibility, as 
shown in Figure 7.38. These settings can be reached via the Me Area (see Chapter 1, Sec-
tion 1.4.3).
Figure 7.38  Personalization by Area of Responsibility
The initial list in Figure 7.39 visualizes the progress of each production order operation, 
including any issues if applicable. Quick views on material, production order, operation, 
work center, and previous statuses offer additional information. After marking one 
entry, you can directly Change Dates and Quantities, Edit, or Release a production oper-
ation, if applicable.
Figure 7.39  Simple List: Manage Production Orders
Based on the Progress of Operation and the symbols indicating Issues, you can navigate 
to the details of each production order operation by clicking the arrow icon next to a 
selected item, as shown in Figure 7.40, which provides sections for Issues, Order Infor-
mation, Components, Order Schedule, Confirmation, and Inspection. Any issues are 
directly listed as the first section for closer investigation.


<!-- Page 360 -->

361
7.2 Scheduling and Manufacturing Execution
Figure 7.40  Object Page of Production Displaying Issues
The Components section shows the status of the assigned components (see Figure 7.41), 
indicating, for example, coverage, scrap, and storage location.
Figure 7.41  Details Page with Section Components


<!-- Page 361 -->

7 Production Execution
362
Operations shows the progress on the operations with the selected operation marked 
and indicating key figures, such as Work Center and Actual Start/Actual End versus 
Scheduled Start/Scheduled End, as shown in Figure 7.42.
Figure 7.42  Details Page with the Operation, Confirmation, and Inspection Sections
You can access additional data by clicking an item of interest to open quick views
(shown in Figure 7.43), or you can navigate to the details of the production operations 
by clicking the arrow icon of the selected item (shown in Figure 7.44).
The production operation details in Figure 7.44 list the Operation Issues, Components
(assigned), Order Schedule, Work Center Schedule, Confirmation, and Inspection (qual-
ity).
The Order Schedule section displays the selected operation as marked. The Work Center 
Schedule section shown in Figure 7.45 lists the Operations in Progress as well as Opera-
tions not Started.
Figure 7.46 shows the last two sections of the production operation details: Confirma-
tion and Inspection. Confirmation lists the production order Confirmations, including 
the confirmed Quantity. Inspection lists the quality Inspection Lots linked to the pro-
duction order.


<!-- Page 362 -->

363
7.2 Scheduling and Manufacturing Execution
Figure 7.43  Quick View on Work Center
Figure 7.44  Details Page of One Selected Operation Displaying Operation Issues


<!-- Page 363 -->

7 Production Execution
364
Figure 7.45  Details Page of One Selected Operation with the Work Center Schedule Section
Figure 7.46  Details Page of One Selected Operation with the Confirmation and Inspection 
Sections
If required, you can directly navigate to the Change Production Order app via the 
related actions button in the header (not shown) to access the app Header screen shown 
in Figure 7.47.


<!-- Page 364 -->

365
7.2 Scheduling and Manufacturing Execution
Figure 7.47  Change Production Order App
7.2.9    Confirm Production Operations
The Confirm Production Operations app (F3069) supports the confirmation process of 
production operations. In Figure 7.48, you start the SAP Fiori app by entering the pro-
duction Order and Operation.
Figure 7.48  Confirmation Entry Screen
On the following screen shown in Figure 7.49, enter the following confirmation details:
▪Yield
Produced quantity to be confirmed.
▪Scrap
Scrapped quantity.


<!-- Page 365 -->

7 Production Execution
366
▪Rework
Quantity needs rework.
▪Reason for Variance
Reason code for deviations.
You can completely or partially confirm the production operation.
After you’ve entered the confirmation details, you can click the Post or Post and Com-
plete buttons in the footer bar (not shown) to post the production operation.
Figure 7.49  Confirmation Details
7.2.10    Create Goods Receipt for Production Order
You can directly create a goods receipt for a production order by using the Post Goods 
Receipt for Production Order app presented in Chapter 5, Section 5.3.
7.3    Production Performance Monitoring
This chapter provides step-by-step instructions for inventory management as part of 
production planning and monitoring in SAP S/4HANA using the recommended SAP 
Fiori apps. You can create your own visual alerts on KPI tiles for a specific time period 
and other related features.


<!-- Page 366 -->

367
7.3 Production Performance Monitoring
7.3.1    Material Scrap
The Material Scrap app (F2035) allows you to monitor expected scrapping defined in the 
material master versus actual scrapping after confirmation. You can choose between 
several layout options in the Material Scrap entry screen, as shown in Figure 7.50, by 
choosing from the dropdown. We’ve selected a bubble chart in our example. You can 
drill down by clicking a bubble and then clicking the down arrow icon to identify the 
root cause of an issue.
Figure 7.50  Material Scrap Displayed as a Bubble Chart
The following KPIs can be calculated, which you select from the dropdown:
▪Material’s Expected Scrap Percentage
▪Material’s Actual Scrap Percentage
▪Material’s Actual Yield Percentage
▪Material’s Actual Rework Percentage
7.3.2    Operation Scrap
The Operation Scrap app (F2034) allows you to monitor expected scrapping defined in 
the routing operation versus actual scrapping after confirmation. You can choose 
between several layout options in the dropdown on the Operation Scrap entry screen 
shown in Figure 7.51. If required, you can drill down here as well by selecting a dot and 
clicking the down arrow icon to zoom in to the root cause of an issue.


<!-- Page 367 -->

7 Production Execution
368
Figure 7.51  Operation Scrap: Line Chart Diagram
The following KPIs can be calculated, which you select from the dropdown:
▪Operation’s Expected Scrap Percentage
▪Operation’s Actual Scrap Percentage
▪Operation’s Actual Yield Percentage
▪Operation’s Actual Rework Percentage
7.3.3    Scrap Reason
The Scrap Reason app (F2216) provides you with a step-by-step analysis to identify the 
root cause for scrap in your production process. You can choose between several layout 
options and drill down from different perspectives. Hence, you can analyze the distri-
bution of actual scrap recorded in production confirmations in the dimensions of time, 
work center, material, plant, and reason for variance. Drilling down to the reasons or 
root causes of the greatest loss of production will help prevent problems in the future.
Begin on the Scrap Reason entry screen, shown in Figure 7.52. In our example, we’ve 
started with a stacked column chart per work center (x-axis), but you can change your 
layout using the dropdown.
Select a column to open the popup shown in Figure 7.53. You can choose between sev-
eral drilldown options. In our example, we’ve selected a Donut Chart.


<!-- Page 368 -->

369
7.3 Production Performance Monitoring
Figure 7.52  Scrap and Rework per Work Center
Figure 7.53  Drilldown Options after Selecting Values
The preselected filters are automatically passed, and the drilldown to the reason code is 
executed, as shown in Figure 7.54.
The following KPIs can be calculated (time frame: last 24 hours), which you select from 
the dropdown:
▪Actual Scrap Percentage
▪Actual Yield Percentage
▪Actual Rework Percentage


<!-- Page 369 -->

7 Production Execution
370
Figure 7.54  Drilldown to Scrap Reasons for the Selected Work Center
7.3.4    Excess Component Consumption
The Excess Component Consumption app (F2171) allows you to monitor expected scrap-
ping defined in the bill of materials (BOM) component versus actual scrapping after 
confirmation. You can choose between several layout options in the dropdown shown 
in Figure 7.55.
Figure 7.55  Component Scrap Deviation in Percentage
If required, the drilldown capabilities allow you to zoom in to the root cause of an issue 
by clicking a column. Hence, you can trace the problems that create the largest excess


<!-- Page 370 -->

371
7.3 Production Performance Monitoring
component consumption in the past and search for a means to prevent these problems 
in the future. Starting from the top three materials with maximum component scrap 
deviation, you can perform a step-by-step analysis for a specific time frame.
You can drill down to the cost of a specific material by selecting one column and clicking 
the down arrow icon. The results are displayed in a bar chart (see Figure 7.56).
Figure 7.56  Drill Down to One Material
The following KPIs can be calculated, which you select from the dropdown:
▪Original Component Demand Quantity
▪Excess Component Consumption Quantity
▪Excess Component Consumption Quantity in Percent
▪BOM Item Scrap in Percent
▪BOM Item Scrap in Percent Deviation
7.3.5    Monitor Production Execution Duration
The Monitor Production Execution Duration app (F2172) allows you to compare actual 
versus planned operation execution duration. The actual operation duration is calcu-
lated based on the production order confirmation. The planned operation duration is 
defined in the production order and calculated based on the routing/master recipe.
You can choose between several layout options via the dropdown, as shown in Figure 
7.57.


<!-- Page 371 -->

7 Production Execution
372
Figure 7.57  Processing Execution: Line Chart Comparing Actual versus Planned
If required, the drilldown capabilities allow you to zoom in to perform a root cause 
analysis of deviations by clicking a column and clicking the down arrow icon. The 
Reporting Period filter allows you to select a predefined time frame. You can enter dif-
ferent units of measure for time calculation.
The following KPIs can be calculated, which you select from the dropdown:
▪Planned Operation Duration
▪Actual Operation Duration
▪Operation Duration Deviation
▪Operation Duration Deviation Percent
7.4    Working with Kanban
Kanban as a means of production planning was introduced in Chapter 4. Here we’ll 
cover the production execution part and explain how to monitor the demand and the 
supply view of a Kanban control cycle.
7.4.1    Display Kanban (Demand View)
The Display Kanban (Demand View) app (Transaction PK13N)—sometimes also known 
as the Kanban board by the production operator—allows you to track Kanban contain-
ers from a demand perspective.
When entering the app, you need to enter the mandatory Plant field, as shown in Figure 
7.58. The other attributes are optional criteria to select the Kanban container of interest. 
Because we don’t have additional criteria, we’ve selected No Area Selection in our exam-
ple and left the Material field blank.


<!-- Page 372 -->

373
7.4 Working with Kanban
Click the Continue button to view the selected Kanban container displayed as a list, as 
shown in Figure 7.59. This view offers generic list capabilities such as sorting, filtering, 
exporting to Excel, and printing, as well as Kanban container-specific functions. You can 
change the Kanban status of the selected row by clicking Set to Empty or Set to Full.
Figure 7.58  Entering the Kanban Demand View with the Plant Mandatory Field
Figure 7.59  Demand View of Selected Kanbans with Time Stamp
To access a legend for the list, click the Display Legend icon in Figure 7.59 (to the left of 
Set to Empty). To see a status summary of all selected Kanban containers, click the over-
view icon in Figure 7.59 (to the right of Set to Full). Both screens are shown in Figure 7.60.
If you display the details of one Kanban container by clicking the details icon in Figure 
7.59 (magnifying glass), you can navigate in Display mode (checkmark icon) or in 
Change mode (pencil icon) to the Replenishment element (e.g., a planned order 128), as 
shown in Figure 7.61.


<!-- Page 373 -->

7 Production Execution
374
Figure 7.60  Legend of Kanban Status (Left) and Kanban Board Overview (Right)
Figure 7.61  Kanban Details with Replenishment Element (Planned Order)
7.4.2    Display Kanban (Supply View)
The Display Kanban (Supply View) app (Transaction PK12N) allows you to track Kanban 
containers from a supply perspective. When entering the app, you need to fill in the 
mandatory fields depending on the context of the supply. Usually, you provide one of


<!-- Page 374 -->

375
7.4 Working with Kanban
the Plant fields and a Person Responsible, Supplier, Issuing Plant, or Storage Location. In 
our example of in-house production in Figure 7.62, we’ve entered the Plant and Person 
Responsible.
Figure 7.62  Entering the Kanban Supply View
Click the Continue button to view the selected Kanban container displayed as a list, as 
shown in Figure 7.63. This view offers generic list capabilities such as sorting, filtering, 
exporting to Excel, and printing, as well as Kanban container-specific functions. You can 
change the Kanban status of the selected row by clicking Replenishment, Status in Pro-
cess, or Status in Transit. The legend and the Kanban overview shown earlier in Figure 
7.60 are also available (not shown).
Figure 7.63  Supply View of Selected Kanbans with Time Stamp
7.4.3    Due Replenishment Elements
The Due Replenishment Elements app (Transaction PKAL) helps you select existing and 
overdue Kanban replenishment elements in the system. Figure 7.64 and Figure 7.66 
show the selection screen when entering the app.


<!-- Page 375 -->

7 Production Execution
376
Figure 7.64  Kanban Replenishment Elements
You start your selection with the mandatory Plant field. The optional selection param-
eters allow you to restrict the result set further.
Click the Execute button to get to the result set. The results list in Figure 7.65 contains 
the list of replenishment elements with their most important information:
▪Material
Material number.
▪Prodn Supply Area
Supply areas required for Kanban (See Chapter 4, Section 4.4).
▪Kanban ID
Key to identify the Kanban container within the control cycle.


<!-- Page 376 -->

377
7.4 Working with Kanban
▪MRP element
MRP element to fill the Kanban container.
▪Replen.elemt
Key of the MRP element.
Figure 7.65  Selected Kanban Replenishment Elements
Figure 7.66  Kanban Replenishment Elements: Selection Screen


<!-- Page 377 -->

7 Production Execution
378
7.4.4    Correct Kanban
The Correct Kanban app (Transaction PK31) supports you in changing existing contain-
ers in a Kanban control cycle. Figure 7.67 shows the screen to enter a Kanban container
correction. Mandatory input fields are Material, Plant, and Supply area to identify a ded-
icated Kanban control cycle.
Figure 7.67  Entry Screen of Kanban Corrections: Keys of the Kanban Control Cycle
Click the Continue button to access the selected Kanban control cycle, as shown in Figure 
7.68. The Status/Quantity, Replenishment, Quantity/Batch, Reverse, and Cancel buttons 
allow you to execute the desired actions on the Kanban control cycle.
Figure 7.68  Selected Kanban Control Cycle


<!-- Page 378 -->

379
7.4 Working with Kanban
7.4.5    Unlock Kanban Container
The Unlock Kanban Container app (Transaction PK09) supports you in locking and 
unlocking selected Kanban containers. You can use this app to onboard and offboard an 
entire Kanban control cycle.
7.4.6    Set Kanban Container Status
The Set Kanban Container Status app (F3717) allows you to set the Kanban container sta-
tus of selected containers from Full to Empty if the container’s content was consumed 
at the production supply side so that a refill is initiated.
Figure 7.69 shows a worklist of Kanban containers on the left side, either manually 
entered or automatically entered by bar code scanning, in the Entered tab. Accidently 
entered containers can be removed from the worklist (Remove button). In the detail 
area, on the right side, you can set the container status and the batch, if applicable. After 
clicking the Save button, the container shows up in the Saved tab.
Figure 7.69  Worklist: Setting Selected Kanban Container Status
When using a bar code reader in “keyboard wedge” mode (i.e., the bar code reader’s out-
put is translated into the keyboard input), you can input the Kanban container and the 
container status via a single scanning operation. You can repeat this operation multiple 
times as the cursor focus is automatically positioned in the next empty input field. 
Make sure that the bar code contains the following data:
<container ID><next status code><enter>.
Allowed values of <next status code> are listed in Table 7.1.


<!-- Page 379 -->

7 Production Execution
380
Note
You can also set the status manually by appending a status code to the container ID in 
the input field.
7.5    What’s Ahead for Production Execution?
Now that we’ve walked through the flow of production execution tasks and the SAP 
Fiori apps that support them, let’s move on to new and upcoming features.
As we have seen throughout this chapter, a lot of app redesign and renaming was per-
formed to streamline the app setup in production planning. The Schedule Production 
app has been renamed to Capacity Scheduling Table (F3770), and the Monitor Work Cen-
ter Schedule app has been renamed to Capacity Scheduling Board (F3951). The Monitor 
Production Orders or Process Orders app (new version, F0266B) serves as entry point 
for management of related orders.
With these recent developments, additional app setting and capabilities were intro-
duced, which make the app usage more convenient and individual to the end user’s 
needs. For example, starting with SAP S/4HANA Cloud Public Edition 2508, the Capacity 
Scheduling Board app (F3951) can be customized to differentiate activities within an 
operation by usage of activity coloring. The app settings need to be set to Discrete for 
the Industry Type (see Figure 7.70).
Status Code
Description
0
Next status will be determined automatically from the status sequence
1
Waiting
2
Empty
3
In process
4
In transit
5
Full
6
In use
Table 7.1  Possible Status Codes as Part of the Bar Code


<!-- Page 380 -->

381
7.6 Summary
Figure 7.70  App Setting: Industry Type Discrete
In addition, Activity Coloring also needs to be toggled on in the App Settings to activate 
that feature, as shown in Figure 7.71. Figure 7.72 shows the activities in different colors 
related to your settings.
Figure 7.71  App Setting Activity Coloring
Figure 7.72  Colored Activities in Operation
7.6    Summary
This chapter explained how SAP S/4HANA supports the end user in production execu-
tion. It highlighted the SAP Fiori apps that can be used to schedule, monitor, and con-
firm production operations. The embedded change management capabilities, such as 
change request handling and note-taking, support exception handling during execu-
tion. Furthermore, working with reservations and Kanbans as a means to control inven-
tory and material flow within your business processes was described. Analytical SAP 
Fiori apps support the end user in monitoring production execution KPIs.
The next chapter covers the analytical SAP Fiori apps in inventory management in 
detail to complete our inventory optimization cycle.
