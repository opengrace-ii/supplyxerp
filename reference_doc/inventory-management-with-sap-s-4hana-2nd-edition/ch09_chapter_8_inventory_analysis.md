# Chapter 8 Inventory Analysis


<!-- Page 382 -->

383
Chapter 8
Inventory Analysis
Inventory analysis with SAP S/4HANA allows you to control and optimize 
your inventory management processes based on SAP Fiori apps. It pro-
vides an idea of which scenario you might make use of with the different 
tools to steer your inventory business in the right way.
So far, we’ve looked at basic information about SAP S/4HANA and how inventory pro-
cesses are reflected in SAP S/4HANA. To gain more insight into your inventory manage-
ment processes, this chapter outlines the analytical capabilities of inventory manage-
ment in SAP S/4HANA.
Inventory analytics in SAP S/4HANA are mainly based on the data created during inven-
tory processing, which is stored in the new data model for material documents. Due to 
this new performance-optimized data model, new analytical functionalities are avail-
able with inventory management. The predelivered business role SAP_BR_INVENTO-
RY_ANALYST can be used with these analytical features. Some basic analytical 
capabilities are also included in the predelivered SAP_BR_INVENTORY_MANAGER and 
SAP_BR_WAREHOUSE_CLERK business roles. These two business roles include at least 
the related overview pages. For more details, check Chapter 3, Section 3.6.2, where the 
business roles are described.
Referring to the optimization cycle of inventory management, which we introduced in 
Chapter 2, Section 2.4, this chapter is about the controlling and analytical tools available 
within inventory management. The following sections touch on different aspects of 
analytical views. We’ll start with analysis of the current and past stock information. 
Afterwards, we’ll discuss monitoring of relevant key performance indicators (KPIs) with 
inventory management in SAP S/4HANA. Based on this, we’ll introduce analytical SAP 
Fiori apps that can be used for analysis and optimization of process flows. Then, you’ll 
see how you might adopt analytical queries according to your needs. We’ll finish the 
chapter by discussing the future of analytics.
8.1    Inventory Analytics in SAP S/4HANA
Analytical capabilities are often used to gain business benefits by analyzing the available 
business data in the SAP system. This also holds true for inventory-based processes.


<!-- Page 383 -->

8 Inventory Analysis
384
Knowledge about slow-moving materials or dead stock situations can be worthwhile 
information to optimize the stock level and, in the end, the bounded capital of your com-
pany.
In this section, we’ll start out with a look at what advances SAP S/4HANA has brought 
to analytics for your inventory management processes, before discussing the available 
tools.
8.1.1    Advances in Analytics
SAP S/4HANA provides several advances to analytics:
▪Real-time data
Based on the new data model to store the main business-relevant data in inventory 
management in SAP S/4HANA, the material document is kept in a column store-ori-
ented database (SAP HANA). This column store provides the basis for real-time ana-
lytics on up-to-date transactional business data.
▪Integrated data
In addition, a state-of-the-art and browser-based user interface (UI) (SAP Fiori) gives 
the right presentation capability for process and stock monitoring and optimization. 
The SAP Fiori pattern was also used to combine analytical with transactional features 
(in-app analytics). For instance, the transactional SAP Fiori app Manage Stock (see 
Chapter 6, Section 6.4.1) contains the inventory KPI range of coverage.
▪Insight to action
Beside the in-app analytics, the SAP Fiori pattern of insight to action brings a power-
ful capability into the analytics world. Based on the semantic object and the related 
navigation targets, the analytical results can be drilled down, for example, to the 
material level, and transactional actions (e.g., transfer postings or scrapping) can be 
performed directly, or a team of warehouse staff can be contacted by adding the rel-
evant business object into a chat.
▪Value-based analytics
Most of the analytical SAP Fiori apps offer the result set in regard to the stock value. 
This offers the chance to compare different materials even if they have different 
units of measure; however, financial aspects also can be judged directly. It’s import-
ant to note that the stock value calculation in inventory management is performed 
based on the current material price multiplied by the stock figures. This holds true 
for all stock value determinations in the SAP Fiori apps of inventory management, 
even if a different reporting date than today is selected. In this case, historical stock 
values are multiplied with the current price of the material. Only in the Stock – Mul-
tiple Materials app is the reporting date also used to determine the price information 
from that date as a basis for multiplication with the historical stock figures.


<!-- Page 384 -->

385
8.2 Posted Stock Change Analysis
8.1.2    Choosing the Right Analytics Tool
The inventory management optimization cycle was introduced in Chapter 2, Section 
2.4. Now we’ll outline which tools and applications are available in SAP S/4HANA that 
support the analyze step of the inventory management optimization cycle. Related to 
Chapter 2, Section 2.4.4, these applications are built upon different application tem-
plates or patterns.
The available tools and applications for analytics, which we’ll see in action throughout 
the chapter, are as follows (many of which you’ll remember from our in-depth discus-
sion of SAP Fiori apps in Chapter 1, Section 1.4.2):
▪Object pages
SAP Fiori app pattern outlining important details for business objects such as mate-
rial document.
▪Overview pages
SAP Fiori app pattern combining different KPIs and relevant data at one glance.
▪Analytical list pages (ALPs)
SAP Fiori app pattern providing a standardized look and feel with graphical and tab-
ular result representations.
▪SAP Smart Business
Application pattern that makes use of core data services (CDS)-based queries.
▪Custom queries and CDS views
SAP Fiori app to adapt CDS queries to your needs (extensibility).
8.2    Posted Stock Change Analysis
During warehouse business, many material movements take place that change the 
stock situation frequently. To make the right decisions in daily business and meet the 
demand and service level of the related goods, a comprehensive and most current view 
on the stock level has to be provided by the system.
In the following sections, we’ll describe related SAP Fiori apps that support checking the 
stock situation of your warehouse. A more detailed and granular analysis (similar to 
SAP Business Warehouse [SAP BW] reporting but based on the most current system 
data) will then be discussed for the material document and the physical inventory doc-
ument.
8.2.1    Stock Single Material and Stock Multiple Materials
The basic analytical functions of inventory management were introduced in Chapter 6 
regarding stock analysis.


<!-- Page 385 -->

8 Inventory Analysis
386
Simple stock checks can be performed with the SAP Fiori app Stock – Single Material by 
entering the material and plant combination. Refer to Chapter 6, Section 6.2.1, for more 
details.
More complex filter criteria are available in SAP Fiori app Stock – Multiple Materials (i.e., 
special stock), and the selection of more than one material is possible. Refer to Chapter 
6, Section 6.2.2, for more details.
8.2.2    Analyze Stock in Date Range
In many cases you may want to understand the root cause of certain inventory stock 
situations, which means you would like to relate the stock information to the material 
document postings. In this case, using the Analyze Stock in Date Range app (F6185) is 
the most suitable approach. The app follows an ALP pattern (see Chapter 1, Section 1.4), 
where the main page displays the stock quantity/value changes within a selected time 
frame (minimum one day). The absolute stock quantity/value and all relative changes 
are displayed per item in an analytical table. All measures are aggregated according to 
the selected dimensions of the analytical table. The maximum granularity are all stock 
identifying fields (Stock Type, Special Stock Type, Plant, Storage Location), as shown in 
Figure 8.1.
Figure 8.1  Entry Screen with Two Plants Selected and Stock Drilldown to All Stock 
Identifying Fields
Consequently, if you remove all dimensions except Plant, you’ll see a higher aggrega-
tion, as shown in Figure 8.2.


<!-- Page 386 -->

387
8.2 Posted Stock Change Analysis
Figure 8.2  Stock Values on Plant Level
The ALP supports a split column layout. Choosing one item displays all associated mate-
rial documents and accounting documents that resulted in the stock quantity/value 
changes shown in the selected item. Figure 8.3 shows an example, where you can see 
that essential information is summarized on the header and all material documents 
and their accounting documents are listed below under Material Postings.
 
Note
Not all material documents have a corresponding accounting document and vice versa.
Figure 8.3  Associated Material Document and Accounting Document Postings on Detail 
Screen of Second Entry on Left-Hand Side
The Analyze Stock in Date Range app is very flexible when analyzing stock quantity/
value changes in a certain time frame. However, not all drilldown options make sense 
due to the underlying transactional data. The app will inform you if the selected com-
bination may lead to rounding differences because of different granularities of stock 
quantities and stock values. Similarly, if the filter criteria lead to a large amount of items 
either on the first or on the detail screen, the Schedule Export feature is strongly recom-
mended to avoid time-outs during online usage. With Schedule Export, you can create 
your analysis offline by a job and receive the result as downloadable Excel file(s).


<!-- Page 387 -->

8 Inventory Analysis
388
When creating the job, you need to enter a Job Name and then can optionally fill in addi-
tional parameters, as shown in Figure 8.4. You can choose whether direct reversals or 
stock without postings shall be excluded by selecting the Exclude Reversal Postings and 
Exclude Postings without Stock options, respectively, or whether the result shall con-
tain stock and postings. All filter criteria are taken over automatically. Sorting, group-
ing, or column selections aren’t taken into account when compiling the Excel file(s). 
Depending on your parameters, you may receive one or many Excel files for download.
Figure 8.4  Scheduling the Desired Analysis as Background Job
After successful job schedule, the confirmation popup directly links you the job details 
or the job results, as shown in Figure 8.5.
Figure 8.5  Schedule Confirmation
You can monitor and display the job execution using the Display Inventory Analytics 
Jobs app (Section 8.2.3). Once the job is finished, the results are attached as Excel files to 
the job results, as shown in Figure 8.6. In case of issues, the job log contains the details.
 
Note
In order to download the job results, you must have been granted the same authoriza-
tion you need for online execution.
Because the job result may (very likely) contain many material stock line items linked 
to many material document/accounting document postings (as we saw previously), the


<!-- Page 388 -->

389
8.2 Posted Stock Change Analysis
Excel files contain an artificial key (Line ID) to link the records in all files and support 
further offline analysis, as shown in Figure 8.7.
Figure 8.6  Offline Analysis Ready for Download (Job Finished)
Figure 8.7  Material Stock (Top) Linked to the Material Postings (Bottom) by Line ID


<!-- Page 389 -->

8 Inventory Analysis
390
8.2.3    Schedule Export of Inventory Analytics and Display Inventory Analytics Jobs
You can manage inventory analytics jobs using two key SAP Fiori apps: Schedule Export 
of Inventory Analytics and Display Inventory Analytics Jobs. You can (regularly) sched-
ule, monitor the execution, download the result, or delete the job entry. Section 8.2.2 
already introduced you to the advantages of scheduling analytic jobs instead of online 
execution. Basically, you can prepare your analytic query in advance and have it ready 
exactly when you need it, independent of online execution times. The list in Figure 8.8 
displays the jobs already scheduled for the export of inventory analytics. You can nav-
igate to the job details with the input parameters, scheduling options, run details, and 
parameters (not shown). If your job has created the desired analytics result, you can use 
it within this app and copy it for regular execution. The Job Template indicates which 
analytical app triggered the job.
Figure 8.8  List of Analytics Jobs in Scheduling Export of Inventory Analytics
Select an existing job and click the Copy button to complete step 1 (Template Selection), 
as shown in Figure 8.9.
Figure 8.9  Providing a Template Name
Next, as shown in Figure 8.10, you define the job scheduling options and the recurrence 
pattern.


<!-- Page 390 -->

391
8.2 Posted Stock Change Analysis
Figure 8.10  Defining the Scheduling Information or the Recurrence Pattern
As shown in Figure 8.11, you can modify the filter parameters or display attributes taken 
over from the original job. You can enter the same filter parameters as if you were work-
ing in online mode (Section 8.2.2). Then, click the Schedule button to schedule your 
newly defined job and monitor its execution.
Figure 8.11  Modifying the Original Parameters
Refreshing the list will show the newly created job, (Full List Per Plant weekly, in our 
example), as shown in Figure 8.12, and its execution status.


<!-- Page 391 -->

8 Inventory Analysis
392
Figure 8.12  The Newly Created Job Is Executed the First Time
Figure 8.13 shows how to monitor the created analytical jobs via the Display Inventory 
Analytics Jobs app. The Job Name entered previously in Figure 8.9 helps you to identify 
the desired job. The Job Status column tells you when the job is finished, and the results 
are ready for download.
The detail screen (already shown in Figure 8.6) allows downloading the job results and 
evaluating the job log.
Figure 8.13  Monitoring Analytic Jobs
8.2.4    Goods Movement Analysis
From an analytical perspective, inventory management offers more detailed and com-
plex features for better process analysis in SAP S/4HANA. Regarding goods movements, 
the Goods Movement Analysis app (F2912) is a comprehensive tool for detailed analysis 
of goods movement (see Chapter 1, Section 1.4).
The SAP Fiori app is based on two CDS views:
▪C_GoodsMovementQuery
▪I_GoodsMovementCube
 
Note
The application design might be comparable to SAP BW applications out of the past. The 
difference is that SAP BW reports required an extraction, transformation, and loading 
(ETL) cycle that sometimes was time consuming so that the final report wasn’t based on 
current business data. The new reporting makes use of the current data in the same sys-
tem where the transactions (i.e., material movements) take place.


<!-- Page 392 -->

393
8.2 Posted Stock Change Analysis
To begin, open the Goods Movement Analysis tile out of the SAP Fiori launchpad, click 
the Go button, and open the Navigation Panel shown in Figure 8.14. The selection and 
output concept is based on dimensions and measures to be selected. Click any mea-
sures’ + icon that you’d like to include in your analysis, and selected symbol will appear 
next to them.
Figure 8.14  Dimensions of Goods Movements
After the selection is done, click the Go button again (upper-right corner, not shown), 
and the result set is displayed in a table view, as shown in Figure 8.15, or in graphical 
view, as shown in Figure 8.16.
Figure 8.15  Goods Movement Analysis Result in Tabular Display


<!-- Page 393 -->

8 Inventory Analysis
394
 
Note
The Is Effective Goods Movement option allows you to distinguish between exclude 
reversed/reversal posting pairs from the selection.
Figure 8.16  Goods Movement Analysis Result in Graphical Display
Based on the given result, a data point in the result set can be selected, and, via the Nav-
igate To feature (upper-left corner, see Figure 8.17), further navigation into all SAP Fiori 
apps that share the same semantic object can be used for more detailed analysis. The 
list of available navigation targets depends on your authorizations.
Figure 8.17  Navigation Targets


<!-- Page 394 -->

395
8.2 Posted Stock Change Analysis
As in SAP BW applications, a drilldown of the results is available to dig down into finer 
granular details regarding a dimension of interest. For example, you can drill down into 
the dimension of material document after initially selecting the Plant dimension as the 
entry point (refer to Figure 8.15).
Select Drilldown • Add Drilldown in the table toolbar. Next, select the new dimension 
you want to see in the result set from the Available Fields list. In our example, as shown 
in Figure 8.18, Material Document, Material Document Item and Material Document 
Year are selected.
Figure 8.18  Selection of Material Document Key Fields for Drilldown
Click the OK button to access the result set. Now the result set gets drilled down into the 
next level of the selected dimension, as shown in Figure 8.19.
 
Further Resources
A wide set of measures and dimensions can be taken into account in the Goods Move-
ment Analysis app, which couldn’t all be listed in this book. For more details, check the 
SAP online help (http://help.sap.com) to get familiar with all the available measures and 
dimensions.
 
Note
The Goods Movement Analysis app is only available on desktop devices.


<!-- Page 395 -->

8 Inventory Analysis
396
Figure 8.19  Drilldown Result Set by the Material Document Key Fields as Dimension
8.2.5    Physical Inventory Document Analysis
Similar to the Goods Movement Analysis app (F2912), the analysis of physical inventory
can be performed via the Physical Inventory Analysis app (F2913).
After starting the SAP Fiori app, two required parameters must be filled (or can be pre-
filled)—Fiscal Year and Is Difference Posted—as shown in Figure 8.20. The Is Difference 
Posted parameter breaks down the result set already by only considering physical 
inventory documents that led to stock corrections after counting.
Figure 8.20  Entry Filter Values of Physical Inventory Analysis
The result set shown in Figure 8.21 can be displayed in the same variants as described in 
the previous section for the Goods Movement Analysis app. After you click the Go but-
ton (upper-right corner, not shown), the result set is displayed.
Figure 8.21  Result Table of Physical Inventory Analysis
In the Physical Inventory Analysis app, the Physical Inventory Document dimension is 
drilled down into in the result set by following the steps described in the previous sec-
tion, creating the result set shown in Figure 8.22. A rather detailed analysis is possible,


<!-- Page 396 -->

397
8.3 KPI Monitoring and Analysis
and analytical questions such as “Which items had the most book value impact in the 
last year?” can be answered.
Figure 8.22  Drill Down into Physical Inventory Analysis Dimension
 
Further Resources
The whole list of dimensions and measures that can be taken into account can be 
accessed via the SAP online help (http://help.sap.com).
8.3    KPI Monitoring and Analysis
Besides gaining knowledge of the stock level, which we described in Chapter 7, it’s also 
important to monitor your most important KPIs to steer your business in the best way. 
In this section, we’ll introduce the tools available for this purpose in inventory manage-
ment in SAP S/4HANA.
 
Note
There is one related SAP Fiori app that we won’t dive into in this section. The Stock Cham-
pion app (F2133) is available as part of business role SAP_BR_INVENTORY_ANALYST, 
which provides monitoring of expiration dates and shortage information about batches 
by using graphical illustrations. This SAP Fiori app was delivered in SAP S/4HANA Cloud
only and isn’t available in on-premise SAP S/4HANA.
8.3.1    Overview Pages
To reflect the role-centric approach of the SAP Fiori launchpad, the SAP Fiori app pattern 
of overview pages was used to combine analytical applications in a kind of a dashboard 
to provide a single point of entry for end users (see Chapter 1, Section 1.4).
In general, inventory management provides three overview pages:
▪Overview Inventory Management (F2769)
▪Overview Inventory Processing (F2416)
▪Inventory Analysis Overview (F3366)
We’ll discuss these pages in the following sections.


<!-- Page 397 -->

8 Inventory Analysis
398
Overview Inventory Management
The Overview Inventory Management (F2769) overview page contains the following 
cards:
▪Stock Value by Stock Type
▪Warehouse Throughput History
▪Monitor Purchase Order Items
▪Overdue Materials – GR Blocked Stock
▪Recent Material Documents
▪Stock Value by Special Stock Type
▪Overdue Materials – Stock in Transit
The Stock Value by Special Stock Type card is shown in Figure 8.23 as an example. The 
card includes navigation capabilities by clicking the header or pie chart. The navigation 
target is the Stock – Multiple Materials app. The navigation includes the selected param-
eters of the card. In our example, by clicking the 623K part of the pie chart, the Stock – 
Multiple Materials app makes it so that only the special stock Orders on Hand is taken 
into account for selection.
Figure 8.23  Card Example Taken from Overview Inventory Management
It’s also important to mention that the underlying SAP Fiori apps often provide implic-
itly displayed application variants. For instance, if the Stock – Multiple Materials app is 
navigated to from the Stock Value by Special Stock Type card, the filter and columns


<!-- Page 398 -->

399
8.3 KPI Monitoring and Analysis
that you select are automatically loaded with the Stock – Multiple Materials app so that 
the relevant information is displayed directly.
You can check the available standard variants directly in the related Stock – Multiple 
Materials app by clicking the down arrow icon to open the list of available variants, as 
shown in Figure 8.24.
Figure 8.24  Predefined Variants Also Used as Navigation Parameters
The cards that should be shown after the overview page is started can be influenced via 
the Manage Cards settings, which you access by opening the user settings in the SAP 
Fiori launchpad, as shown in Figure 8.25.
Figure 8.25  Manage Cards
The Overview Inventory Management overview page has a mandatory Plant filter that 
needs to be filled out before a data selection can take place due to the value-based eval-
uation provided in the Stock Value by Stock Type and Stock Value by Special Stock Type


<!-- Page 399 -->

8 Inventory Analysis
400
cards. These cards summarize the stock values accordingly, but this can only be per-
formed for stock values in the same currency. Based on the relationship that each plant 
belongs to one company code (see Chapter 3), and each company code has one company 
code currency, the selection by one plant leads to one currency of the stock values in 
the same plant.
Overview Inventory Processing
The Overview Inventory Processing (F2416) overview page is part of the warehouse clerk 
business role and offers the following cards:
▪Recent Inventory Counts
▪Monitor Purchase Order Items
▪Warehouse Throughput History
▪Recent Material Documents
▪Overdue Materials – Stock in Transit
▪Overdue Materials – GR Blocked Stock
▪Outbound Delivery List
▪Inbound Delivery List
In comparison to the Overview Inventory Management overview page, this overview 
page doesn’t include stock values and is more focused on the daily warehouse business 
and logistical aspects that are relevant for a warehouse clerk.
Inventory Analysis Overview
A more analytical focus is given in the third overview page: Inventory Analysis Over-
view (F3366).
This overview page is especially designed for analytical purposes and provides analyti-
cal cards in a KPI-based manner. As of the time of writing (summer 2025), the overview 
page contains four cards:
▪Stock Value Increase despite Consumption
▪More than 100 Days without Consumption
▪Monitor Batches by Longest Time in Storage
▪Monitor Batches by Shortest Expiration Date
Figure 8.26 shows an example of the Stock Value Increase despite Consumption analyt-
ical card, and Figure 8.27 displays an example of the More than 100 Days without Con-
sumption analytical card.


<!-- Page 400 -->

401
8.3 KPI Monitoring and Analysis
Figure 8.26  Stock Value Increase Despite Consumption
Figure 8.27  Chart with More Than 100 Days Without Consumption
8.3.2    Inventory Turnover Analysis
The Inventory Turnover Analysis app (F1956) allows you to analyze the inventory turn-
over in relationship to average inventory value. In general, the inventory turnover is 
determined by taking into account the goods issues in relationship to the average stock


<!-- Page 401 -->

8 Inventory Analysis
402
in a given time frame. If a material movement is a goods issue, the classification is taken 
from the related setting of the movement type (table T156, field KZVBU → consumption 
posting; see also Chapter 3, Section 3.1.3). The average inventory value is calculated 
based on the current price.
Like most of the SAP Fiori apps based on smart templates, the Inventory Turnover Ana-
lysis app begins with a filter bar that allows you to specify the result set regarding the 
given filter criteria, as shown in Figure 8.28.
Figure 8.28  Filter Bar of the Inventory Turnover Analysis App
The following parameters can be used for filtering:
▪Mandatory filter values
– Analytics Date Range
– Plant
▪Optional filter values
– ABC Indicator
– Material Type
– Material Group
The only field that requires a bit of explanation is the ABC Indicator field, which is taken 
from the material master record of the material.
 
Note
This app doesn’t consider special stocks like Transaction MC44 and intracompany-
related goods issues do.
The result is displayed in a scatter chart or bubble chart after you click the Go button. 
The scatter chart is shown in Figure 8.29 and the legend is shown in Figure 8.30.
The same result set can also be displayed as a bubble chart (shown in Figure 8.31 and fol-
lowed by the legend in Figure 8.32) by using the toggle button (upper-right corner of the 
chart, not shown).


<!-- Page 402 -->

403
8.3 KPI Monitoring and Analysis
Figure 8.29  Scatter Chart of the Result Set
Figure 8.30  Legend for the Scatter Chart
Figure 8.31  Result Set as a Bubble Chart


<!-- Page 403 -->

8 Inventory Analysis
404
Figure 8.32  Legend of a Bubble Chart
You can select one data point in the bubble chart in the SAP Fiori app to drill down and 
gain more insight into selected data, as shown in Figure 8.33.
Figure 8.33  Selection in a Bubble Chart
The outline graphical result can be analyzed so that if the inventory turnover is high, 
the material isn’t kept very long in storage, meaning the time between goods receipt 
and goods issue is rather short.
On the one hand, the bubble chart makes use of a coefficient of variance for goods issues 
(see the y-axis of the bubble chart). The coefficient is calculated based on standard devi-
ation of goods issues quantity per day divided by the average goods issue quantity in 
the selected time frame multiplied by 100. A low coefficient reflects a steady goods 
issue.


<!-- Page 404 -->

405
8.3 KPI Monitoring and Analysis
On the other hand, the scatter charts make use of an average inventory value (see the 
y-axis of the scatter chart). The average inventory value is calculated by multiplying the 
average stock quantity of the selected time frame with the current price of the material. 
In addition, the app automatically groups the result set into top categories such as Top 
10% (see Figure 8.30).
By selecting a data point in the chart, the app offers a detail page for the selected mate-
rials that outlines more detailed inventory turnover data.
8.3.3    Inventory (Multiple) KPI Analysis
The Inventory KPI Analysis app (F3749) offers a multiple KPI analysis tool that enables 
you to compare different KPIs for different time series. The following KPIs are sup-
ported:
▪Stock Changes
▪Consumption Changes
▪Inventory Aging Changes
▪Inventory Turnover Changes
▪Range of Coverage Changes
When you open the app, you’re met with three mandatory filter values that must be 
entered up front during data selection because they are essential for the result set deter-
mination and processing, as shown in Figure 8.34:
▪Display Currency
▪Inventory Consumption Group
▪Comparison of
▪Reference Date
Figure 8.34  Filter Bar of the Inventory KPI Analysis App
Display Currency is mandatory due to normalization of the inventory values to one cur-
rency. Different plants in different company codes could have different currencies, 
which would make summing up the stock values impossible. Therefore, the inventory 
values are all converted to the same display currency.


<!-- Page 405 -->

8 Inventory Analysis
406
Inventory Consumption Group allows you to define which material movements are to 
be considered as stock consumption for your particular analysis. Its configuration is 
explained in Chapter 3, Section 3.1.3.
 
Note
In a central distribution center, all material movements related to stock transports may 
be considered as consumption, whereas in a local warehouse all material movements 
related to goods issue process may be considered as consumption.
Both time frames to compare are displayed below the filter bar calculated on the input 
of the Reference Date and the Comparison of attribute. The reference period and previ-
ous period will be visualized by different colors in the graphical display (see Figure 8.35).
Besides the mandatory filters, many additional filters related to stock identifiers (e.g., 
material or stock type) and some others (e.g., material type or material group) are avail-
able for filtering.
After the data set is received, a table view outlines the result either in a stacked bar chart 
or as a table. The view can be toggled between the chart and table by clicking the toggle 
button (upper-right corner of chart, not shown). We’ll go with the bar chart, as shown in 
Figure 8.35. If you’d like to export your analysis at any point in time, simply switch to 
the tabular display and choose the generic Export to Excel feature of SAP Fiori.
Figure 8.35  Column Bar Chart of the Inventory KPI Analysis App with KPI Stock Value as 
Column Chart
To configure the layout (chart type, dimensions, measures, and drilldown level) you can 
use the following options (see Figure 8.36):
▪Dimensions for drilldown (left-hand side)
▪Going to View Settings, and selecting Measures under the Chart tab (middle)
▪Chart type configuration (right-hand side)


<!-- Page 406 -->

407
8.3 KPI Monitoring and Analysis
Figure 8.36  Chart Configuration Options
The configuration contains a powerful way to adapt the outlined KPIs and groups (refer 
to Figure 8.35) and provides the option to outline up to four measures as different axes. 
In addition, you switch the chart type and display more than one KPI in the chart.
To narrow down the filtered result set in respect to the five different KPIs supported by 
this app, a KPI filter is available, as shown in Figure 8.37. For a respective KPI, all data pairs 
(previous period/reference period) are distributed according to their relative change in 
% along the x-axis in 11 groups (25 % steps, ranging from <-100% to >+100%). You can 
optimize and influence the selection in the main chart by using the blue bars on the left- 
and right-hand side of the KPI graph shown in Figure 8.37, which uses the example of the 
Stock Changes and Consumption Changes KPIs. 
Figure 8.37  KPI Filter


<!-- Page 407 -->

8 Inventory Analysis
408
The example in Figure 8.37 eventually selects materials with a small decrease to large 
increase in stock value, and a significant decrease in consumption comparing the pre-
vious with the reference period.
The KPI filter offers an easy graphical way of showing figures of the given KPIs statisti-
cally by representing outliers in a frequency distribution chart. The selection can be 
changed by dragging and dropping the related blue frame (see Figure 8.37). Afterwards, 
this adjustment narrows down the result set of the main chart by clicking Apply to Chart 
or Table.
You can further analyze the given result by drilling down in the chart and selecting one 
or multiple data points in the chart (refer to Figure 8.36).
For example, select your chosen dimension (Company Code in our example), which 
results in the chart shown in Figure 8.38.
Figure 8.38  Drilling Down by Company Code (Details per Tooltip)
Now you can see that which company codes owns the majority of the stock value in the 
reference period.
The second step is to drill down by material to gain insight to determine which materi-
als own this stock value, as shown in Figure 8.39. To do so, perform the same steps as for 
Company Code, but this time, choose Material from the dropdown list.


<!-- Page 408 -->

409
8.3 KPI Monitoring and Analysis
Figure 8.39  Drill Down per Material (Details in Tooltip)
Based on the second drilldown, you hit the ground and can figure out that only a few 
materials are responsible for the high stock values in the given company code, allowing 
inventory managers to now act accordingly. Of course, you can use the other KPIs if 
they are more convenient for your use case either as filter criteria in the frequency dis-
tribution chart (refer to Figure 8.37) or as measure of the chart (refer to Figure 8.36).
 
Note
If the result set after the drilldown contains too many entries that flood the chart with 
different materials, for instance, use the magnifying glass icons (refer to Figure 8.26) to 
zoom in or out to get a more convenient graphical display.
8.3.4    Material Valuation
We’ve talked a lot about inventory management analytics in SAP S/4HANA with a 
strong focus on stock figures. We also mentioned that the stock figures are just half the 
truth and that the stock itself might not be enough to steer a company’s business pro-
cesses. In the end, the financial impact is the important factor for steering business pro-
cesses (even logistic ones). Therefore, inventory management analytical features also 
contain price and inventory value information. The price considered is always the cur-
rent price. The inventory values are calculated by multiplying the stock figures (current


<!-- Page 409 -->

8 Inventory Analysis
410
or historical) with the current price, which means the inventory values are derived from 
the current price.
The price itself isn’t directly related to inventory management. Its home ground is in 
the area of material valuation in the material ledger.
Material valuation also provides some applications for analytical features related to 
price and inventory value. These apps are part of the SAP_BR_INVENTORY_ACCOUN-
TANT business role; the following are two examples of such apps:
▪Material Inventory Values-Balance Summary (F1422)
Provides the capability of analyzing stock quantity information together with inven-
tory values for a certain reporting date.
▪Material Inventory Values-Line Items (F1423A)
Provides the capability of drilling down stock and inventory value information to a 
single line item.
▪Display Material Value Chain – Actual Costs (F4905)
Provides the capability of tracking the progression of material quantities and values 
along the product value chain (procurement, production, transfers, and sales).
 
Further Resources
For more detailed information, go to the SAP Fiori apps reference library and search for 
one of the preceding apps. In addition, look at the rest of the apps that are part of the 
SAP_BR_INVENTORY_ACCOUNTANT business role. To do so, open the SAP Fiori apps ref-
erence library, and select All Apps. Enter your SAP Fiori ID (e.g., “F1422A”), and check the 
Other Apps in Cost Accountant – Inventory section.
8.4    Process Analysis Tools
In Chapter 6, we introduced the core inventory management features that cover the 
standard inventory management processes. In addition to these standard features, 
some more process-specific SAP Fiori apps are available in SAP S/4HANA. With the tools 
that we’ll discuss in this section, you can analyze and optimize your process perfor-
mance. Therefore, these tools are an essential part of the inventory management cycle 
(see Chapter 2, Section 2.4).
8.4.1    Dead Stock Analysis
During usual warehouse and stock keeping processes, sometimes goods are no longer 
moved or consumed. In addition, an increase of stock values despite consumption 
might occur for many reasons (e.g., less demand, decreasing usage in bill of materials


<!-- Page 410 -->

411
8.4 Process Analysis Tools
[BOM], etc.). However, the heaviest impact comes from no stock usage in a certain time 
frame, which would mean that these goods are dead stock, which is tied up capital.
In combination with the inventory value, dead stock becomes a relevant business 
insight if there are high values or increasing values in a certain time frame.
The smart template pattern ALP (see Chapter 1, Section 1.4) was used for the Dead Stock 
Analysis app (F2899) to gain insight into such a trend of dead stock. Because a sum of 
stock values is required, and a certain time frame for analysis has to be selected, the app 
contains a standard filter bar with three mandatory filter values to fill out, as shown in 
Figure 8.40:
▪Analytics Start Date
▪Analytics End Date
▪Display Currency
Figure 8.40  Filter of Dead Stock Analysis with Semantic Date Control
The result set becomes available after you click the Go button, and a graphical filter is 
displayed that you can use to narrow down the results, as shown in Figure 8.41.
To configure the graphical filter, click the gear icon. Up to four different axes and two 
categories/series can be selected to adapt the graphical filter according to your needs. 
Below the graphical result filter, you can find the results table with one line in the result 
set per stock identifier.
Figure 8.41  Graphical Filter and Table with Items


<!-- Page 411 -->

8 Inventory Analysis
412
8.4.2    Slow or Non-Moving Materials
Besides dead stock, slow or nonmoving materials might be of interest for the inventory 
manager or analyst. With the Slow or Non-Moving Materials app (F2137), you can search 
for these kinds of stock issues and get an overview of the affected materials. As in the 
Dead Stock Analysis app, this app is based on the smart template pattern ALP (see Chap-
ter 1, Section 1.4) and includes the elements filter, graphical filter, and result table. You’ll 
start with the filter bar, as shown in Figure 8.42.
Figure 8.42  Filter Bar of the Slow or Non-Moving Materials App (Semantic Date Control)
This SAP Fiori app is special because it contains more powerful filter options related to 
Customizing, as follows:
▪Days with Low Consumption
Starting with the mandatory filter Days with Low Consumption, you can specify the 
time frame in which you would expect and analyze low consumption of this inven-
tory.
▪Reference Date
The endpoint of the time frame to be analyzed is the second mandatory filter, Refer-
ence Date. This means if you enter the reference date with 7/6/2025 and 90 days for 
Days with Low Consumption, the system will analyze the past 90 days beginning with 
July 6, 2025.
▪Display Currency
The Display Currency acts the same as in the rest of the SAP Fiori apps and serves as 
a common factor for calculating the stock value across different plants.
▪Inventory Consumption Group
Consumption postings can be threaded in a very differentiating way in this SAP Fiori 
app via this filter value. Inventory consumption groups are defined in a separate IMG 
activity as described in Chapter 3, Section 3.1.3, and not only by the setting per move-
ment type. You can also define different groups of consumption postings so that 
analysis can be performed for a certain group of consumption-related movements 
as mentioned in Section 8.3.3.
▪Slow-Moving Indicator
The last mandatory filter is the Slow-Moving Indicator supplementary option. This 
indicator is based on the formula consumption of the time frame divided by stock 
quantity in relation to the reference date multiplied by the days of the reporting time 
frame. The result reflects the consumption-to-stock ratio. Different reporting peri-
ods can be compared using this filter.


<!-- Page 412 -->

413
8.4 Process Analysis Tools
 
Note
By choosing a convenient range of the slow-moving indicator, you can identify nonmov-
ers, slow movers, medium movers, or fast movers.
The list of materials shown in Figure 8.43 is displayed after you click the Go button and 
drill down to plant 1010 by selecting the respective column in the column chart.
Figure 8.43  Graphical and Table Data in the Slow or Non-Moving Materials App 
after Drilldown
The Slow or Non-Moving Materials app also offers a detail screen for each result entry, 
which you can access by clicking the right-facing arrow icon on the right-hand side. The 
KPIs shown on the detail screen support you in decision making and eventually help 
you to take the best measure for each selected entry in the main list.
The details screen contains a header and multiple charts with KPIs. Basic data around 
the slow or nonmoving item is given in the header section as outlined in Figure 8.44 by 
displaying the most important information, such as Slow Moving Indicator and Stock 
Value.
Figure 8.44  Detail Screen Header Information
Slow-moving indicator data is displayed as a time series-based bar chart in the chart sec-
tion of the detail page, as shown in Figure 8.45. To access the detail page, you have to 
click a result item. The given historical data of the Slow-Moving Indicator (bar) is out-
lined for 12 months into the past, starting with the selected reference date.


<!-- Page 413 -->

8 Inventory Analysis
414
Figure 8.45  Chart Slow-Moving Indicator Over Time
To further facilitate the analysis, Figure 8.46 shows a time series of Stock Quantity, Stock 
Consumption, and Active BOM Usage over time. Any BOMs referencing the potential 
slow mover are listed, too.
Figure 8.46  Active BOM Usage, Stock Quantity, and Stock Consumption on Detail Screen
To overcome a slow-moving state, redistribution of the respective material to other 
plants may be a solution. Figure 8.47 shows the Slow Moving Indicator/Stock Quantity
for each material/plant combination. The quick view allows you to initiate stock trans-
fers by navigating to the Transfer Stock – Cross-Plant app (see Chapter 6, Section 6.3.2).
Figure 8.47  Slow-Moving Indicator/Stock Quantity in Different Plants


<!-- Page 414 -->

415
8.4 Process Analysis Tools
8.4.3    Overdue Stock in Transit
Along with the KPI-based analytical SAP Fiori apps we introduced in Section 8.3, inven-
tory management in SAP S/4HANA also provides apps that are more focused on certain 
inventory processes and allow for inventory process optimization to meet inventory 
process service KPIs.
For example, the Overdue Materials – Stock in Transit app (F2139) provides insight into 
the processing of stock transport orders as related to the creation of the stock transport 
order and the goods receipt. Figure 8.48 shows the filter options. Because you can have 
multiple deliveries, goods issues, and goods receipt per stock transport order item, the 
mandatory parameter GI/GR Document Selection is very important to reduce the result 
set. Normally you’re only interested in the latest combination. The history of all docu-
ments can be displayed on the detail screen.
Figure 8.48  Filtering Options
The result chart of Overdue Materials – Stock in Transit outlines the shipping duration 
(see micro chart) and is shown after you click the Go button. The micro chart starts with 
the Posting Date (PO) of the stock transport order (i.e., 2025-06-26) and determines the 
delivery date based on the date given in the stock transport order. On July 06, 2025, for 
example, there is no overdue stock transport order because the Forecast Delivery Date
was 2025-07-07 (Line 1 in Figure 8.49). Therefore, the stock has been in transit for 10 days 
already, as show in column Days in Transit. Line 4 displays an item where the forecast 
delivery date was set to the past (2025-02-07) when creating the stock transport order 
(2026-06-26) to illustrate the overdue case.
Figure 8.49  Overdue Stock Transport Orders
Similar to other analytical apps with complex use cases, the Overdue – Stock in Transit 
app offers a detail page per item to support decision making. Figure 8.50 depicts the


<!-- Page 415 -->

8 Inventory Analysis
416
header of the detail screen with status information and key attributes. Below you see 
the process flow as time series (left to right) of the selected item. If there are more doc-
uments (previous or later) per stock transport order item, clicking All would display 
them.
Figure 8.50  Detail Screen with Header and Process Flow (Less Information)
Figure 8.51 illustrates figures on quantities, duration, and dates of the selected item.
Figure 8.51  Detail Screen with Figures
By using the semantic links of the list or the detail header, you can trigger follow-up 
actions on the stock transport order, delivery, or material document.


<!-- Page 416 -->

417
8.5 Custom Queries
8.4.4    Overdue Goods Receipt Blocked Stock
Regarding overdue stock, the Overdue Materials – Goods Receipt Blocked Stock app is 
available (F2347).
The foundation for this process monitoring app is the daily inventory management busi-
ness when goods receipts are posted into the nonvaluated goods receipt blocked stock
(movement type 103). Goods are received conditionally, aren’t valuated, and aren’t free 
for use. For this kind of stock, companies often have internal service levels. For instance, 
goods shouldn’t be kept for longer than three days in goods receipt blocked stock. They 
must be reverted to the supplier or posted into the unrestricted use stock (movement 
type 105). This SAP Fiori app offers a list (see Chapter 1, Section 1.4) for analysis of overdue 
stock. By using the Days since Posting Date filter, you can select only goods receipt post-
ings that exceed the company’s service level, for instance, greater than five days as a fil-
ter value. After you click the Go button, the result is shown (see Figure 8.52).
Figure 8.52  Overdue Goods Receipt Blocked Stock
8.5    Custom Queries
In SAP S/4HANA, analytical functions are built on CDS views to ensure a consistent view 
of the new data model in the SAP HANA database. CDS views in inventory management 
are especially implemented in a way that ensures the most consistent and performant 
access to the required analytical data. These predefined and predelivered CDS views 
might not be enough to serve your analytical reporting requirements comprehen-
sively. For example, the required data might be shared across database tables that aren’t 
part of inventory management, such as material master data.
To meet this need for custom queries, the Custom CDS Views app (F1866) is available, 
which allows you to create custom CDS views and queries to implement analytical que-
ries for special requirements that aren’t part of the SAP S/4HANA standard delivery.
 
Further Resources
Check out the SAP S/4HANA online help (http://help.sap.com) concerning Applications 
for General Functions for Key Users to gain more insight about available key user tools.


<!-- Page 417 -->

8 Inventory Analysis
418
Custom CDS view queries have to be built on CDS views that are predelivered by SAP 
and must be released in a way that they can be consumed in the Custom CDS Views app 
(see Chapter 9, Section 9.1). To find available CDS views that can be reused in custom CDS 
views, you have to open the Custom CDS Views app and create a new custom CDS view, 
as shown in Figure 8.53. We’ll provide a Label and Name to identify our custom CDS 
view, and select Analytical Cube from the Scenario dropdown to choose the right busi-
ness context for your customer query. The Analytical Cube must contain the superset 
of all measures and dimensions you would like to include in your custom query.
Figure 8.53  Creating a New Custom CDS View
We’ll create an analytical CDS view on table MATDOC with an association to the product 
master. Click the Create button to open the wizard, which will guide you in the next 
steps. First you select your primary data source in Figure 8.54, which is I_GoodsMove-
mentCube in our example.
Figure 8.54  Select Your Primary Data Source


<!-- Page 418 -->

419
8.5 Custom Queries
After you select the primary data source, you can choose the associate data source by 
clicking on the Add button, as shown in Figure 8.55.
Figure 8.55  Choose Associated Data Sources via the Add Button
After adding I_Product, you should see both data sources on the Data Sources tab, as 
shown in Figure 8.56.
Figure 8.56  Added I_Product Data Source
To connect these two data sources, you must maintain the association properties by 
clicking on the paper clip icon in the Join Condition column in Figure 8.56 to access the 
screen shown in Figure 8.57. In our example, both data sources are connected via their 
Product field.


<!-- Page 419 -->

8 Inventory Analysis
420
Figure 8.57  Define Join Condition
Now you must maintain the field list that the custom CDS view should return in the Ele-
ments tab. In our example, as shown in Figure 8.58, among other fields the product 
group has been added from the I_Product data source to the result. All added fields are 
marked in column Used.
Figure 8.58  Select Additional Elements to Display
In the same step, you can define each element's Label and Alias, as shown in Figure 8.59. 
To configure other semantic properties (aggregation, unit of measure, value helps, text 
associations, etc.), you switch to the Element Properties tab (details not shown). You can 
always use the Check function to validate your custom CDS view.


<!-- Page 420 -->

421
8.5 Custom Queries
Figure 8.59  Define Elements and Element Properties
You can check your configuration or publish (by clicking the Publish button) your new 
custom CDS view so that it can be used in analytical queries afterward. Before the cus-
tom CDS view is published, you can also use the Preview Data function to see the result 
of the newly created custom CDS view directly in the Custom CDS Views app, as shown 
in Figure 8.60.
Figure 8.60  Data Preview


<!-- Page 421 -->

8 Inventory Analysis
422
 
Note
A successful data preview requires that your end user has the authorization to display 
the data in addition to the authorization to create custom CDS views. To find out about 
the authorization, consult the documentation of the analytical cube selected as primary 
data source.
After publishing your custom CDS view, the Next Steps option in Figure 8.61 suggests 
follow-up actions, such as creating a custom analytical query.
Figure 8.61  Successfully Published CDS View and Next Steps to Guide to Follow-Up Actions
8.6    Real-World Scenarios and Best Practices
When analyzing inventory in the real world, you may encounter particular scenarios or 
cases that require special practices or considerations. The following examples were 
compiled based on discussions with customers during recent years.
8.6.1    Analyzing Your Serialized Stock
When working with serialized materials as explained in Chapter 6, Section 6.7.2, you 
may face the challenge that there’s a mismatch between the inventory stock of serial-
ized materials and the number of serial numbers in the system. Often the root cause is 
that the serial number profile(s) (discussed in Chapter 3, Section 3.2.2) doesn’t fully 
embrace the logistics processes to allow the serialized stock movements to be posted 
without entering the serial numbers. Therefore, it’s often the case that you want to 
know the current state and the history of a serialized material item. The Serial Number 
History app (F7368) helps you answer the following questions:
▪In what material stock is the serial number xx-xxx-xxx?
▪What serial number has the material stock abc?
Figure 8.62 shows how to search for a specific serial number in stock. The result list 
shows all materials with stock with this particular Serial Number, the Stock Type, Stor-
age Location, and the System Status of the stock.


<!-- Page 422 -->

423
8.6 Real-World Scenarios and Best Practices
Figure 8.62  Searching for a Specific Serial Number in Stock (Detail Page Not Shown)
Figure 8.63 displays how to search for the serial numbers of a selected material. In addi-
tion, the detail page of a list item is shown in a split column layout (on the right-hand 
side). You can see Stock Information and the posting History as a list of business docu-
ments involving this serialized material item. With this data, you can track the move-
ment of the serialized material item within your company.
Figure 8.63  Searching for All Serial Numbers for a Dedicated Material
As an additional feature, the posting History is also shown in a time-dependent Graph
(see Figure 8.64).


<!-- Page 423 -->

8 Inventory Analysis
424
Figure 8.64  Serial Number History as Graphical Display
You can click the Display Change Log button in the header to display any changes to the 
serialized material item in a modal window, as shown in Figure 8.65.
Figure 8.65  Associated Change Documents
8.6.2    Controlling Inventory
There is often an overlap between the role of an inventory accountant and of an inven-
tory manager. It’s important to understand that the granularity of the inventory values 
in comparison to inventory quantities is different (see Chapter 1). If, for example, the 
Stock – Multiple Materials app displays the (historic) inventory value for unrestricted 
use stock, blocked stock, and stock in quality inspection in one line item, the quantities 
are calculated by summing up the respective material document postings, but the (his-
toric) inventory value is calculated by the rule of three (proportionally distributing the 
total value of the line item according to the stock quantities to calculate the inventory 
value of unrestricted use stock, blocked stock, and stock in quality inspection). This cal-
culation is done on the lowest possible level and therefore aggregation/disaggregation 
may lead to rounding differences. That’s why the inventory accounting view (Section 
8.3.4) and the inventory manager view may differ.


<!-- Page 424 -->

425
8.6 Real-World Scenarios and Best Practices
Nevertheless, it’s a good practice in some companies to take an inventory snapshot at 
the end of each fiscal period/month. This can be easily achieved by defining a recuring 
job with the template Export of Inventory Analytics: Stock Multiple Materials in Figure 
8.66 shipped with the Schedule Export of Inventory Analytics app (Section 8.2.3). Con-
sequently, the snapshot is saved as an Excel attachment to the job.
Figure 8.66  Creating an Inventory Snapshot via Export to Excel
8.6.3    Monitoring Shelf Life
One crucial task in inventory management is to monitor batch-managed inventory, 
which has a shelf-life expiration date (see our example in Figure 8.67 taken from the 
object page of the Batch Master Data app). In general, service-level agreements (SLAs)
are linked to these batches, and the closer the shelf-life expiration date of a batch, the 
more difficult it is to use in the next process step. In many cases, this may finally lead 
to a complete loss of the inventory batch, because the stock needs to be scrapped.
Figure 8.67  Batch with Shelf-Life Expiration Date


<!-- Page 425 -->

8 Inventory Analysis
426
Figure 8.68 shows a variant created for the Stock – Multiple Materials app, setting the 
Shelf Life Expiration Date filter to be before to monitored best before date (July 7, 2025) 
and Unrestricted Stock number equal to 0. Furthermore, the Shelf Life Expiration Date
column is sorted by oldest to newest for convenience.
Figure 8.68  Stock – Multiple Materials with Variant Monitoring Shelf Life with Best Before 
Date
You can use the Save as Tile feature of the SAP Fiori launchpad (see Chapter 1, Section 
1.4) to create a monitoring tile on your home screen or an insight card.
 
Note
If you would like to monitor shelf life with other inventory analytic applications that 
don’t cover the shelf-life expiration date attribute by default, you can use data source 
extensibility (see Chapter 3) via the association to I_BATCH to add the Shelf Life Expira-
tion Date field to the respective SAP Fiori app.
8.7    What’s Ahead for Analytics?
We can dream of quantum leaps in the IT world if predictive analytics/machine learning 
can be combined with process automation. A first step into this new area is part of the 
Overdue Materials – Stock in Transit app via automated information about stock trans-
port orders that might be of interest for setting the Delivery Completed indicator (see 
Figure 8.69). Based on the new situation handling framework in SAP S/4HANA, you get 
notified if there are stock transport orders that you’re responsible for that aren’t com-
pletely delivered but already have a goods receipt.
In this regard, the My Situations app (F4154) has to be mentioned. This SAP Fiori app pro-
vides access to all open situations and easy navigation into the single situations for the 
end user to gain insight and act accordingly.


<!-- Page 426 -->

427
8.7 What’s Ahead for Analytics?
Figure 8.69  Warning Triangle for Possible Delivery Completed Purchase Orders
In the detail page of the Overdue Materials – Stock in Transit app (click on one item of 
the result to enter the detail screen, as shown in Figure 8.70), an action button is added 
to the header so you can choose the Close Situation option. This button is only visible 
if the following are true:
▪The currently displayed purchase order item isn’t already completely delivered.
▪Sufficient authorizations are assigned to the end user.
▪A goods receipt was posted already, and the total goods receipt quantity equals the 
total goods issue quantity.
Figure 8.70  Situation in Detail Page


<!-- Page 427 -->

8 Inventory Analysis
428
Before the situation functionality can be used in the Overdue Materials – Stock in Tran-
sit app, two administrative steps have to be performed:
▪Set up a team
▪Set up a situation
The setup of a new situation team can be done with the Manage Teams and Responsi-
bilities app (F2412), which is part of the SAP_BR_BUSINESS_PROCESS_SPEC business 
role. In Chapter 3, Section 3.3.3, the setup of situation handling was described in general.
Follow these steps to set up a team:
1. Create a new team.
2. Enter the team name (e.g., “Overdue SiT Monitoring”).
3. Enter the type.
4. Add your team member with the function “SMMIM_IM”.
5. If you have multiple end users for the same team, assign another function for the 
next end user.
6. Save your team.
Next is to set up the situation itself, which is done by using the Manage Situation Types 
app (F2947), as shown in Figure 8.71.
Figure 8.71  Search for Situation Template
Follow these steps to set up the situation (see Figure 8.72):
1. Select the standard template MAN_MATLOVERDUESITSITN on the Situation Tem-
plates tab, and click the Copy button.
2. Enter an ID (e.g., Stock Transport Order Overdue; see Figure 8.72).
3. Enter the right conditions to identify the stock transport orders you would like to be 
notified of.


<!-- Page 428 -->

429
8.8 Summary
4. Maintain the batch job scheduling time.
5. Remove all responsibility definitions under Responsibility by Teams, and add the 
Member Function you defined in the team setup. Only the team functions assigned 
here will retrieve the related notifications (see Figure 8.73).
6. Click the Save button to enable your new situation type.
Figure 8.72  Admin Information of the Situation
Figure 8.73  Assignment of Responsibilities
After saving and enabling your situation type, you be notified when the job detects any 
instances that match the filter criteria defined in the situation template.
8.8    Summary
The analytical tool kits available within SAP S/4HANA cover a wide range of analytical 
capabilities. With new SAP Fiori patterns and a modernized data model of the material 
document in inventory management, real-time analytics are feasible. As outlined in 
this chapter, analytical features were introduced in transactional applications, and 
more process-oriented analytical tools are available, such as detection of overdue stock 
or monitoring of process KPIs.
In the next and final chapter of this book, we’ll highlight some aspects of inventory 
management in cloud deployments and explain how cross-system analytics and stra-
tegic planning and optimization are possible.
