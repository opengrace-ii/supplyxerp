# Chapter 2 Inventory Management Basics


<!-- Page 56 -->

57
Chapter 2
Inventory Management Basics
Now that we’ve established the technical details, we’ll begin our discus-
sion of inventory management and how it has changed in SAP S/4HANA. 
Let’s start with the basics.
This chapter introduces the basics of inventory management by defining the key inven-
tory terms and outlining the key activities of the planning/adjusting, execution, and 
analysis phases of inventory management. Looking at the content map provided in the 
preface (see Figure 1 under “How This Book Is Organized”), this chapter is like a node that 
ties together the configuration, planning, analysis, and execution parts of inventory 
management.
Let’s begin by explaining how inventory fits into the supply chain.
2.1    Inventory as a Staple of the Supply Chain
Inventory defines the entire quantity of stock used in the business processes of an 
enterprise. Different product types result in different inventory types, such as raw 
materials, semifinished goods, work in process (WIP), finished goods, and spare parts. 
Inventory falls into different categories called stock types. In SAP S/4HANA, up to 60 dif-
ferent stock types can be defined in the system. Stock types define how inventory can 
be used in the business processes, on what organizational level they are maintained, 
and how the inventory is valuated. In addition to the inventory stock types, there are a 
few stock types not controlled by inventory management. In SAP S/4HANA, stock types 
are represented technically by the Stock Type field and the (optional) Special Stock Type
field, plus additional keys. The key combinations defining the inventory stock types 
used in your SAP S/4HANA system can help you understand your inventory manage-
ment processes. Frequently used inventory stock types in SAP S/4HANA business pro-
cesses are as follows:
▪Unrestricted-used stock
Stock can be consumed in any business process.
▪Blocked stock
Stock is blocked from any usage, except transfer postings.
▪Quality inspection stock
Stock is subjected to quality inspection. This stock type might be managed by quality 
management in SAP S/4HANA.


<!-- Page 57 -->

2 Inventory Management Basics
58
▪Transfer stock
Stock is moved from one organizational unit to another in a two-step process only 
by means of inventory management.
▪Stock in transit
Stock is moved from one location to another but isn’t available for consumption. 
There are different subtypes of stock in transit depending on the kind of transfer of 
goods and title. These processes stretch beyond inventory management and involve 
internal procurement and logistics execution.
▪Vendor consignment stock
Stock is owned by the vendor but is available for consumption in your business pro-
cess.
▪Customer consignment stock
Stock is owned by you as a supplier but located at a customer site and ready for con-
sumption by the customer.
▪Orders-at-hand stock
Stock is linked to a specific sales order item.
▪Project stock
Stock is linked to a specific project.
Some stock types are closely linked to industries processes, such as tight empties (retail) 
or stock provided to the (subcontracting) vendor. Thus, the stock type might exist only 
at the plant level (customer consignment stock), whereas other stock exists on the stor-
age location level.
Noninventory stock types in SAP S/4HANA include the following:
▪Reservations
▪Nonvaluated goods receipt blocked stock
In a nutshell, stock types and special stock types define the process ownership of a stock 
quantity and the corresponding stock value. Transitioning from one stock type to 
another is key to defining the business process in logistics. For example, say you pro-
cure semifinished goods via vendor consignment (special stock type K) into the quality 
inspection stock (stock type), because you set up the respective quality management-
specific data in the material master (i.e., inspection type). After a successful quality 
inspection, you provide the unrestricted use stock (stock type) to your subcontractor as 
a component (special stock type O with key vendor ID) while taking over its ownership. 
Eventually you receive the finished goods from your subcontractor as unrestricted use 
stock (stock type) while posting the consumption of the stock provided to the vendor 
(special stock type O with key vendor ID).
The flow of inventory within an enterprise is called the supply chain. Thus, inventory is 
the key factor to be looked at in supply chain planning. Inventory can be created by 
external procurement and/or internal production.


<!-- Page 58 -->

59
2.1 Inventory as a Staple of the Supply Chain
Figure 2.1 shows the principal components of a supply chain for an example company 
called My Company. Inventory is either procured externally, produced internally, or 
produced by subcontractors externally. Inventory is consumed within production pro-
cesses and eventually sold as a finished product. These principal components might be 
combined differently depending on the involved products, product lifecycle, location 
strategy, or market requirements.
Figure 2.1  Supply Chain of My Company
An optimal supply chain keeps the costs linked to inventory low (procurement, produc-
tion, warehousing, distribution) while providing the desired service level to all customers. 
Depending on your business process, there are multiple strategies to achieve this goal:
▪Just in time (JIT)/just in sequence (JIS) production
Prominently used in the automotive industry to ensure that all components of a car 
reach their final assembly step exactly at the moment they need to be consumed.
▪Kanban
Helps to simplify your inventory replenishment strategy by using predefined lot 
sizes tied to moving containers (see Chapter 4, Section 4.4 and Section 4.9).
▪Demand-driven material requirements planning (DDMRP)
Material requirements planning (MRP) strategy that aims to to decouple bottleneck 
steps in supply chain planning (see Chapter 4, Section 4.3.4 and Section 4.8).
▪Vendor-managed inventory
Shifts the inventory management responsibility to the vendor of a component.
▪Make to order (MTO)/make to stock (MTS)
Allows you to plan your inventory based on concrete demands or on demand fore-
casts (see Chapter 4, Section 4.6).
My Company
Procure
Sell
My
Subcontractors
Produce
Externally
Inventory
Produce
Internally
My
Customers
My
Suppliers


<!-- Page 59 -->

2 Inventory Management Basics
60
▪Make or buy
Decision regarding whether or not you outsource the procurement of a component/
finished good to an external contractor.
 
Note
We’ll discuss in Chapter 9, Section 9.4.1, how company-wide inventory optimization 
can be achieved as part of supply chain planning with SAP Integrated Business Plan-
ning (SAP IBP).
2.2    End User Role Templates
When talking about inventory management, it’s also important to consider the 
involved business roles. Each company will have a different organizational structure 
with different responsibilities, which is often considered a competitive advantage. Nev-
ertheless, the basic requirements of supply chain planning must be fulfilled. Therefore, 
the roles and responsibilities might have different names in each company, but the 
semantic will most likely exist. SAP S/4HANA entails several role templates that facili-
tate the system configuration (see Chapter 3, Section 3.6).
The major parts in supply chain planning are shown in Figure 2.2 (sales isn’t shown 
because it’s not covered in this book). 
Figure 2.2  Roles and Responsibilities in Supply Chain Planning
Purchasing
Planning
• Planner
   of External
   Procurement 
Purchasing
• Purchaser
Goods
Receipt
• Warehouse 
   Clerk
• Receiving
   Specialist
Product
Engineering
• Production
   Engineer
Product/
Inventory
Planning
• Production
   Planner
• Inventory
   Analyst
Production
Execution
• Production
   Supervisor/
   Operator
Quality
Inspection
• Quality
   Engineer
Goods Receipt
• Warehouse
   Clerk
• Receiving
   Specialist
Demand
Planning
• Demand
   Planner
Inventory
• Inventory
   Manager
Internal Production
External Procurement


<!-- Page 60 -->

61
2.3 Key Considerations
The role templates for external procurement process are shown in the upper part and 
the templates for the internal production process are shown in the lower part. Produc-
tion input consists of demand planning and product engineering. Every time logical or 
physical movement of inventory is required, the warehouse clerk/receiving specialist 
is involved. Production planning is supported by the inventory analyst, and all inven-
tory processes are supervised by the inventory manager (plant manager).
2.3    Key Considerations
This section introduces some key aspects of inventory management. After all, our moti-
vation is to provide the best services/products to our customers at the best price 
(approximate internal price + calculated margin). To keep the narrative focused, we sim-
plified the basic equations in hopes of not alienating product cost controllers.
2.3.1    Service Levels, Inventory Costs, and Operational Profit
Enterprises need to balance the service level with inventory cost and operating profit. 
Normally a target is defined by the enterprise as part of its business model, containing 
an optimal zone surrounded by comfort zones in which the balance is still within an 
acceptable range (see Figure 2.3).
Figure 2.3  Balancing Service Level with Inventory Value (Schematic Drawing)
0
10
20
30
40
50
60
70
80
90
100
Operating Profit
Legend: 
Inventory Value
Service Level
Optimum
Comfort
Zone
Comfort
Zone
Company Target
Business Failure
Business Failure
Operating Profit versus Inventory Value


<!-- Page 61 -->

2 Inventory Management Basics
62
Operating profit equals roughly the following equation, which is highly simplified:
Revenue – Inventory costs – Production costs = Operating profit
The service level defines the ability of a company to fulfill its customers’ requirement 
so that revenue is generated. Customers’ requirement fulfillment refers to the require-
ment that the company must deliver its goods/service to the customer on time, in qual-
ity, and in budget. Inventory costs are all costs needed to obtain, process, store, and 
distribute goods and have substantial impact on service level. Figure 2.4 roughly illus-
trates the formula to calculate inventory costs based on storage and order costs. 
Although order costs tend to decrease with the ordered quantity, the storage costs will 
consume this benefit at a certain quantity level.
 
Note
Not considered in the cost calculation of Figure 2.4 is the locked-in capital bound in the 
inventory value.
Figure 2.4  Inventory Costs in Relation to Order Quantity
All strategies mentioned in Section 2.1 are intended to find the optimal balance or at 
least reach the comfort zone in Figure 2.3. If you consider all factors influencing service 
level and inventory costs, it’s obvious that this is a multidimensional optimization chal-
lenge. SAP S/4HANA supports you in finding a local optimum and holding on to it in a 
dynamic environment.
2.3.2    Lot Sizes, Replenishment Times, and Safety Stocks
To reduce the complexity of the optimization challenge, inventory planners typical 
work with some key factors that essentially influence service level and inventory costs 
during the product lifecycle.
Order Quantity
Storage Cost + Order Cost
Storage Cost
Order Cost per Unit
Cost


<!-- Page 62 -->

63
2.3 Key Considerations
The lot size is the amount of inventory that is obtained in one atomic step. Given a con-
stant linear consumption, the larger the lot size, the higher the locked-in capital, and 
the lower the replenishment frequency. Figure 2.5 depicts how three different lot sizes 
influence the procurement process.
The replenishment lead time is the duration in days to execute this step. It’s composed 
of several steps, such as ordering, transport, and goods receipt. Figure 2.5 shows the 
inventory value over time based on a constant replenishment lead time. The shorter 
the replenishment lead time, the more flexible your planning options.
Inventory stock will never fall below the safety stock level. It represents the lowest limit 
of stock quantity that is required to fulfill the service-level agreement (SLA). The higher 
the defined safety stock, the higher the bottom line of locked-in capital and the storage 
costs (refer to Figure 2.4). Figure 2.5 shows a constant safety stock definition. Normally, 
replenishment is triggered way before the inventory value reaches the safety stock. 
There are multiple planning strategies to implement an optimal replenishment pro-
cess, which will be discussed in Chapter 4, Section 4.1.
Figure 2.5  Key Factors in Supply Chain Planning
You can see that a small lot size and a high frequency of replenishments create a 
smoother curve in Figure 2.5, whereas a large lot size and a low frequency of replenish-
ments create a rough curve.
0
50
100
150
200
250
Inventory Value
Inventory Value
Legend:
Lot Size 1
Lot Size 2
Lot Size 3
Safety
Stock
Date of Order
Date of Goods
Receipt
Replenishment
Lead Time
Consumption
Order 1 Order 2 Order 3
Order 4
Order 5
Order 6
Locked-in
Capital
Time


<!-- Page 63 -->

2 Inventory Management Basics
64
In general, Figure 2.5 illustrates the interdependence of the key factors of lot size, safety 
stock, and replenishment lead time. It’s based on an ideal supply chain planning world 
of nonchanging linear consumption and 100% reliable replenishment. Real-world sup-
ply chain planning needs to deal with sudden consumption changes, delays in replen-
ishment, production resource constraints, missing components, unplanned changes in 
product lifecycles, quality issues, legal regulations, tax changes, and product and pro-
duction variants. All these factors impact the comfort zone shown earlier in Figure 2.3. 
Section 2.4 will shed some light on how SAP S/4HANA supports you in consistently 
monitoring your supply chain processes and adjusting them to the optimum level.
The product lifecycle impacts the planning strategy too. Figure 2.6 shows a simple prod-
uct lifecycle with the typical phases:
1. Ramp-up
2. Active demand
3. Phase-out
4. Ramp-down
5. SLA
6. Removal from stock
Simple means there are no demand fluctuations due to seasonal effects or market 
changes, which require a more sophisticated planning. During ramp-up, the planning 
strategy needs to be adjusted to the growing market requirements. Often, during ramp-
up, supply and demand aren’t balanced well. When market requirements create a con-
stant demand for the product, inventory can be planned on optimized nonchanging 
parameters. If the product lifecycle reaches its end, planning needs to be adjusted. If 
SLAs influence the product lifecycle, inventory must be kept although the product is no 
longer actively used. Eventually, the product becomes obsolete and is removed from 
inventory. If the planned demand exceeds actual demand, excess inventory will be cre-
ated (arrows in Figure 2.6).
On the opposite side, if the planned demand is below the actual demand, your ability to 
fulfill the market requirements is endangered (not shown in Figure 2.6). Therefore, the 
more reliable your prognosis, the more accurate your planning, and the better your 
inventory key performance indicators (KPIs) will be.
Every time the product lifecycle reaches a different phase, the planning strategy needs 
to be readjusted. The more proactively the phase changes are detected, the better the 
inventory can be planned. SAP S/4HANA offers different capabilities, such as prognosis 
tools and monitoring tools to optimize the product lifecycle. Section 2.4 will explain 
how SAP S/4HANA supports you in analyzing market trends and adjusting your prog-
nosis and planning strategy proactively.


<!-- Page 64 -->

65
2.3 Key Considerations
Figure 2.6  Typical Product Lifecycle
2.3.3    Local versus Global Inventory Management
When considering inventory management, it’s also crucial to understand the organiza-
tional scope of all your activities. Organizational units make up one dimension of 
inventory management, and the second one is composed of functional aspects repre-
sented by stock types (which we discussed in Section 2.1). The typical organizational 
planning unit is one plant in SAP S/4HANA. However, it’s also possible to subdivide a 
plant into multiple MRP areas to execute planning on a smaller set of products. Similar 
rules apply to analytics, which are performed on the plant level but can also be executed 
across multiple plants or vice versa on organizational structures below the plant level, 
for example, the MRP area. When it comes to execution, you can perform activities 
within a plant or cross-plant. In SAP S/4HANA, the organization structure above the 
plant is the company code. Usually, material valuation is performed on the plant level, 
however, it’s also possible to configure material valuation on company code level 
(rarely used; see Chapter 3). In some cases, you may need to subdivide each material’s 
inventory even further based on its origin or its lifecycle status using split valuation 
(see Chapter 3).
All SAP Fiori apps in SAP S/4HANA support local as well as global inventory manage-
ment strategies by the following means:
▪Organizational structures
▪Filter criteria within all SAP Fiori apps along organizational structures and stock 
identifying fields
0
1000
2000
3000
4000
5000
6000
Ramp up
High demand
High demand
Phase out
Phase out
End of active
lifecycle
Ramp down
Low demand
Low demand
+  SLA
Low demand
+  SLA
Low demand,
SLA-triggered
replenishment
Low demand
+  SLA
End of
lifecycle
Removal from
stock
Stock value
Legend:
Stock consumption
Active BOM usage
Gaps indicate unwanted excess of stock value


<!-- Page 65 -->

2 Inventory Management Basics
66
▪Custom enhancements of filter criteria
▪Authorization based on organizational structures
▪Roles created for local or global inventory management tasks
2.3.4    New Technologies
Technology helps end users complete their daily work as efficiently as possible. SAP has 
been introducing some new technologies in SAP S/4HANA to improve end user produc-
tivity in a rapidly changing environment. Figure 2.7 sketches the evolution of the intel-
ligent ERP.
Figure 2.7  Evolution of Intelligent ERP with an Increasing Number of Automated Tasks
Today, end users are performing a lot of daily routine tasks that consume most of their 
working time due to the following:
▪Breaks in communication medium
▪Lack of adequate information during decision making
▪Distributed data, which needs to be collected by hand
▪Process monitoring by manually defined and calculated KPIs
▪Decisions based on experience/guessing, not on facts
▪Change management-induced workarounds
0
10
20
30
40
Intelligent Enterprise
Task automation
Legend:
Simple routine tasks
High value generating tasks
Data collected in system
Total
Working
Time
Type of Task Distribution 
Time


<!-- Page 66 -->

67
2.3 Key Considerations
Typical indicators of manual tasks are the abundant use of spreadsheets in e-mails, 
shares, and the number of Post-It notes attached to computer monitors. With SAP
S/4HANA, SAP has created the first release supporting an intelligent enterprise. In infor-
mal terms, you can call it the vision of a low-touch ERP. Basically, a low-touch ERP sys-
tem frees end users from their daily routine tasks so that they can spend more time on 
high value generating tasks, as illustrated by the darkest area in Figure 2.7.
Technically, the ERP system can be configured to record all manual decisions made by 
human interaction. After a while (if the data set is large enough), the key user can train 
and activate machine learning models based on this data set. These machine learning
models support end users in decision making. Furthermore, key users may define con-
ditions that will lead to end user notification or even automatic issue resolution based 
on those machine learning models. With large language models (LLMs), the second gen-
eration of AI-based decision making is just being incorporated in software products, 
including SAP S/4HANA.
We’ll take a closer look at important new technologies and how they enhance inventory 
management processes in the following sections.
Situation Handling
In Chapter 1, Section 1.4.3, we already explained many features that comprise a low-
touch ERP, such as embedded navigation, information sharing, personalization of the 
working environment, role-based UIs, built-in collaboration tools, and mobile options. 
SAP S/4HANA includes additional capabilities to reduce manual tasks in end users’ daily 
business. Figure 2.8 outlines the principles of typical tasks during daily work:
1. You define conditions that require manual intervention by a dedicated group of end 
users.
2. You need a set of information to complete this intervention successfully.
3. Depending on the provided information, you select the most appropriate action.
As shown in Figure 2.8, SAP S/4HANA offers a framework called situation handling, 
which allows key users to define conditions, the related information, and the responsi-
ble set of end users to take the actions depending on their business roles. This is called 
a situation.
Once defined, the situation creates notifications if the condition of the situation applies 
and automatically informs the responsible end user, who can navigate to an SAP Fiori 
app and get proposals on how to solve the situation. The configuration steps connected 
to situation handling are described in Chapter 3, Section 3.3.3. Examples of how to lever-
age situation handling in inventory management are provided in Chapter 4 and Chap-
ter 8.


<!-- Page 67 -->

2 Inventory Management Basics
68
Figure 2.8  Situation Handling Framework
First-Generation Machine Learning
When interacting with the system, end users often make decisions based on the expe-
rience they have had in the past. In general, this is called learning. With the recent prog-
ress in machine learning, an ERP system can support an end user’s decision making by 
displaying their own (machine) learning and offering an unbiased experience based on 
mathematical principles.
This is like a car navigation system recommending the best way home. If you know the 
way yourself because it’s your daily route, the navigation system may just give a second 
opinion enhanced with recent traffic information. If you don’t know the way at all, the 
navigation system is normally the best choice you have.
Figure 2.9 displays the basics of first-generation machine learning. To set up a first-
generation machine learning model, you need to complete data analysis to shape the 
model. After the model is in place, it must be trained to be consumable. Training isn’t a 
one-time task but may or must be repeated once in a while if the underlying training 
data changes. If retraining doesn’t take place, the machine learning model’s prediction 
will become more and more inaccurate.
Technically, SAP S/4HANA offers two kinds of predictive models. You can have an 
embedded model or a side-by-side installation on SAP Business Technology Platform 
(SAP BTP). The first type is simpler to set up because training and querying the model 
happens within one system. The second type gives you more freedom, as you could also 
embed additional machine learning algorithms or use external data for training.
Condition
Related
Information
Action
Situation
Key User: 
Defines Condition
Prepares Related
Information
Sets Responsibility/Functions
and Authorizes Actions
End User:
Is Notified by the System
Evaluates Information
and Takes Action


<!-- Page 68 -->

69
2.3 Key Considerations
Figure 2.9  Machine Learning Principles/Types of Predictive Models
Figure 2.10 explains how the machine learning model training takes place. Prerequisite 
is a sufficient set of training data that is divided up into at least two buckets during 
training. The larger bucket (normally 75% of the entire training data) is used to train the 
model. After training, the model’s performance is validated with the second bucket. If 
the performance of the model on both buckets is more or less equal, the model is 
trained well. If not, training conditions need to be adjusted until a sufficient predictive 
capability is accomplished.
Figure 2.10  Machine Learning Details
Machine Learning: Process Flow
Data Analysis
Data Preparation
and Training
Model Consumption
Retraining
Customer Input
Types of Predictive Models: Embedded or Side by Side
Model
Model
Business Process
SAP S/4HANA Instance
SAP BTP
Query and
Training
Query
Training on
External Data
Training Data
Model
Validation Data


<!-- Page 69 -->

2 Inventory Management Basics
70
In many cases, the performance of a predictive model is expressed as a confusion matrix, 
which is an N × N matrix. N is the number of different states to be predicted by the 
machine learning model. Figure 2.11 shows an example with N = 2. The light segments 
represent the correct prediction, and the dark segments represent the false prediction.
Figure 2.11  Confusion Matrix with Two Values A and B
Second-Generation Machine Learning
In the past few years, the second generation of machine learning became available and 
has been incorporated into IT systems. The second generation is based on LLMs, which 
represent a pretrained machine learning model following a certain structure. LLMs typ-
ically support user machine interaction by:
▪Inputting facilitation
▪Explaining technical output in a human-readable format
▪Guiding the user to a meaningful next interaction step
LLMs are often trained on general data (texts), but any query to an LLM can be enriched 
by additional domain-specific information so that the response appears meaningful in 
the respective situation. This is called grounding. The query itself is normally hidden 
from the end user and generated by the IT system automatically. LLM query design is 
referred to as prompt engineering. Sometimes user input is taken as a prompt by a smart 
assistant, so it looks like you’re chatting with the IT system. Figure 2.12 shows you how 
free text input (top screen) is translated into filter criteria (bottom screen) in an SAP Fiori 
list application (see Chapter 1, Section 1.4.1). In our example, our query for special stock 
type K in plant 1410 has automatically filled in Plant and Special Stock filter criteria in the 
Manage Physical Inventory Documents app. You can switch between the AI-assisted 
mode and normal mode by the toggle button in the top-right corner.
As another example, Figure 2.13 shows an error message during user input of a unit of 
measure that isn’t convertible to the stockkeeping unit. By clicking the Generate Expla-
nation button, the error is explained to the end user based on its context in the message 
long text (primary help document), as shown in Figure 2.14. The grounding is provided 
by the secondary help document collection available for SAP S/4HANA.
True Values
Predicted Values
A
B
A
B


<!-- Page 70 -->

71
2.3 Key Considerations
Figure 2.12  Input Facilitation by Translating a Free Text into Filter Criteria and Executing a Query
Figure 2.13  Input Error of a Wrong Unit of Measure


<!-- Page 71 -->

2 Inventory Management Basics
72
Figure 2.14  Error Explanation
Figure 2.15 shows an object page displaying a stock transport process between a plant in 
the US and a plant in Germany that will be summarized into a human-readable text doc-
ument ready to be used in any text processor afterwards. You initiate the summariza-
tion by clicking the Summarize button in the top-right corner. The following modal 
window allows you to select the object page’s sections to be included, and the result is 
a formatted text document, as shown in Figure 2.16.
Figure 2.15  Object Page Content Selected for Summarization


<!-- Page 72 -->

73
2.3 Key Considerations
Figure 2.16  Object Page Content Transformed into Formatted Text Document
The AI-based assistant Joule, embedded into the SAP Fiori launchpad, also supports your 
daily work. It allows you to chat with SAP S/4HANA. Let’s assume you’re working on 
your physical inventory. Figure 2.17 illustrates how you start Joule out of the Manage 
Physical Inventory Item app by clicking the diamond icon in the SAP Fiori launchpad 
header. Then you start a new conversation and ask for all the material documents of the 
material in question (TG0011) in 2025. Joule provides you with an object list, and you can 
traverse the list items by clicking the Open button, as shown in Figure 2.18.


<!-- Page 73 -->

2 Inventory Management Basics
74
Figure 2.17  Joule Finds Material Documents for You
Figure 2.18  Joule Displays Them on Request


<!-- Page 74 -->

75
2.3 Key Considerations
2.4    Inventory Optimization in SAP S/4HANA
As pointed out in Section 2.3, supply chain management requires constant refinement 
and adjustment of the company’s business processes. If this isn’t done, the supply chain 
isn’t operated at an optimal level, and the operating profit is reduced.
In the following sections, we’ll introduce the optimization cycle, discuss each step in 
detail, and refer to the chapter in which the tool support provided by SAP S/4HANA is 
explained. In case you’re interested in cross-company code optimization along your 
entire supply chain via automatic tooling, stay tuned for Chapter 9, Section 9.4.1.
2.4.1    Optimization Schema
Figure 2.19 depicts the optimization schema used throughout this book. The three steps 
are detailed in the following sections. In general, the schema’s steps can be found in var-
ious project management or product management optimization strategies such as lean 
production, continuous improvement process, or Scrum. It entails a planning step, an 
execution step, and an analysis step. Each step is the input of its successor. The optimi-
zation cycle time is dependent on various factors, such as the following:
▪Type of product
▪Involved business process
▪Stability of the environment
Figure 2.19  Optimization Cycle
Usually, the higher the uncertainty, the faster the cycle time. It’s quite common to cat-
egorize products according to criteria such as contribution to operating profit and/or 
product value. This is often referred to as ABC analysis or ABC/XYZ analysis. The catego-
ries are also used to plan the optimization cycle time (see Figure 2.20). A matrix, as 
shown in Figure 2.20, helps you focus your optimization planning. Essentially, it clus-
ters your inventory to help you focus on changes that have a significant impact on your 
company’s overall performance.
Plan and
Adjust
Execute
Analyze


<!-- Page 75 -->

2 Inventory Management Basics
76
Figure 2.20  Classification Matrix According to Product Value and Product 
Consumption Variability
When looking back at Figure 2.19, you may wonder what level of detail the optimization 
cycle is about. Basically, this idea isn’t linked to any specific level of detail. It can be used 
in strategic supply chain planning as well as in optimizing the goods receipt process of 
a warehouse. If you look at the supply chain process of your company, you’ll ideally find 
something like Figure 2.21.
Figure 2.21  Stacked Optimization Cycles at Various Levels
X
Y
Z
C
B
A
Product Value 
Variable Consumption
Plan and
Adjust
Execute
Analyze
Strategic Supply
Chain Planning
Analytical KPI
Definition
Strategy
Evaluation
Plan and
Adjust
Execute
Analyze
Plan and
Adjust
Execute
Analyze
Production
Planning
Plan and
Adjust
Execute
Analyze
Warehousing
Plan and
Adjust
Execute
Analyze
Transportation
Planning
Plan and
Adjust
Execute
Analyze


<!-- Page 76 -->

77
2.3 Key Considerations
 
Note
During optimization, you focus on high value/high profit generating products (A prod-
ucts). B and C products are taken into account with the lower frequency.
Figure 2.21 shows that there are various levels on which you can execute the optimiza-
tion cycle:
▪Strategic enterprise level (defining KPIs or shaping the planning strategy; see Chap-
ter 9)
▪Division or subdivision level (optimizing subprocesses, such as production planning, 
warehousing, or transportation planning)
▪Single loading point, storage location, or material level (not shown in Figure 2.21)
2.4.2    Plan and Adjust
During the plan and adjust step, you typically share information and discuss the impact 
on the business. The system provides automatic or semiautomatic solution proposals. 
Your input is the analysis of the past and you target the future.
Figure 2.22 shows that the essential part of planning is sharing knowledge, looking at 
historic figures, and considering the system proposals to adjust the system settings. In 
Chapter 1, Section 1.4.1, we already highlighted the generic collaboration tools embed-
ded in the SAP Fiori launchpad. Chapter 4 explains the SAP S/4HANA collaboration and 
knowledge-sharing tools designed for production planning in depth. They can be used 
to asynchronously exchange structured and unstructured information. They may also 
be used to store historic discussions.
Figure 2.22  System and Human Collaboration During Planning
In upcoming chapters, we’ll discuss various examples where the SAP S/4HANA system 
supports planning and adjusting by sending alerts about critical supply chain situations, 
Share and exchange
information
Adjust settings
Alert/propose
SAP S/4HANA
Evaluate
historic
data


<!-- Page 77 -->

2 Inventory Management Basics
78
making automatic solution proposals, and indicating process disturbances. Synchro-
nous interactions are supported natively in SAP Fiori apps because most of them offer 
insight-to-action capabilities.
2.4.3    Execute
During the execute step, you typically run your daily tasks, such as monitoring business 
processes, detecting and correcting plan deviations, and dealing with all planned and 
unplanned tasks in your daily work schedule. As we’ll touch on in Chapter 5, Chapter 6, 
and Chapter 7, SAP S/4HANA supports your daily work with a variety of role-based mon-
itoring tools. Additionally, you can personalize your own KPI-based monitoring apps 
within your SAP Fiori launchpad. There are role-based SAP Fiori apps used to collect 
worklists based on the end user’s responsibility. Based on the pyramid approach (see 
Chapter 1, Section 1.4.1), SAP Fiori apps offer quick actions for the most frequently 
required tasks and highly powerful transactions to solve extreme cases.
Figure 2.23 depicts the sequence of SAP Fiori apps called by an end user in an SAP
S/4HANA system. As explained in Chapter 1, Section 1.4, SAP Fiori apps guide end users 
seamlessly until they can complete their daily tasks. The role concept supports the end 
user by only offering the features and functions required for this specific role. There-
fore, SAP Fiori apps greatly enhance end user productivity in an SAP S/4HANA system. 
As explained in Section 2.3.4, in the end, you strive to focus on high value generating 
tasks and let the system do the routine work.
Figure 2.23  Different Users Executing Tasks in SAP S/4HANA
SAP Fiori
Launchpad
Material
Shortages
Worklist
SAP Fiori
Launchpad
Warehouse
Clerk Overview
Page
Overdue Goods
Receipt Blocked
Stock
Purchase Order
Object Page
Material Document
Object Page
Good Receipt
for Purchase
Order
SAP Fiori
Launchpad
Create Goods
Movement
SAP Fiori
Launchpad
Goods Receipt
for Inbound
Delivery
Production Planner
Taking Care of Material
Shortages
Warehouse Clerk
Monitoring Goods Receipt
Blocked Stock Process
Receiving Specialist Creating a
Goods Receipt of an Inbound
Delivery on a Mobile Device
Plant Manager
Creating a Material-
to-Material Posting


<!-- Page 78 -->

79
2.3 Key Considerations
Let’s break down the examples shown in Figure 2.23:
▪For a production planner taking care of a material shortage, the Material Shortage 
Monitoring app (F0247) provides alerts for upcoming shortages and automatically 
creates a solution proposal.
▪For a warehouse clerk monitoring goods receipt blocked stock processes, the Over-
view page (F2416) alerts them of any stock locked up in goods receipt blocked stock 
and directs them to the monitoring application supporting a resolution.
▪For a receiving specialist creating a goods receipt of an inbound delivery on a mobile 
device, the Goods Receipt for Inbound Delivery app (F2502) leads them to a mobilized 
SAP Fiori app supporting in-app bar code scanning.
▪For a plant manager creating a material-to-material posting, the Create Goods Move-
ment app (Transaction MIGO) offers an expert mode of all material document post-
ing configured in the system.
2.4.4    Analyze
During the analyze step, end users check and evaluate current and historic data to draw 
conclusions for the next plan and adjust step. Figure 2.24 displays different kinds of ana-
lytical SAP Fiori apps and their intended usage.
Figure 2.24  Map of Analytical Applications Embedded into SAP S/4HANA
Operational
Strategic
Object
Page
Overview
Page
List Monitoring
Analytical
List Page
SAP Smart
Business
Natural Language
Interaction
Analysis Path
Framework
Grid
Custom CDS
SAP Analytics
Cloud
Freestyle
Freestyle
Freestyle
Professional User
Casual User


<!-- Page 79 -->

2 Inventory Management Basics
80
It’s important to understand that the user category on the x-axis depends on the busi-
ness context of the end user. A sales operator is a professional user for any analytical 
sales application, but merely a casual user for an inventory application. The types of SAP 
Fiori apps mentioned in Figure 2.24 are explained in Chapter 1, Section 1.4.
The y-axis of Figure 2.24 defines the analytic capabilities of the SAP Fiori app, which is 
normally proportional to its ease of use. The natural language interaction (NLI) will sup-
port the casual user for operational analysis. SAP Analytics Cloud and custom core data 
services (CDS) views will support the professional user for strategic reporting. Most of 
the analytic SAP Fiori apps follow certain patterns; however, there may be freestyle apps 
in all kinds of categories. What all analytical SAP Fiori apps have in common is that the 
analysis is done in real time, that most of them are extensible, and that they are role 
based. Some analytical KPIs are even integrated into predominant transactional SAP 
Fiori apps. Results of any analysis can be shared with the collaboration tools mentioned 
previously. The analytical SAP Fiori apps crucial to inventory management are explained 
in depth in Chapter 8. In case you need analytical capabilities evaluating multiple source 
systems, we’ll explain the capabilities of SAP Business Data Cloud in Chapter 9, Section 
9.4.4.
2.5    Summary
This chapter defined some key terms for supply chain planning in general and inven-
tory management in particular. After reading this chapter, you should be familiar with 
the concept of safety stock, replenishment lead time, and lot size. Moreover, you should 
understand a product lifecycle and know the principle of an optimization cycle consist-
ing of three steps: plan and adjust, execute, and analyze. Finally, the idea of a low-touch 
ERP, also known as intelligent enterprise incorporating the latest AI features, should 
have triggered some expectations for the following chapters.
Before we start to enter the optimization cycle, we need to walk through the configura-
tion tasks in the next chapter.
