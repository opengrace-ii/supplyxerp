# Chapter 4 Planning and Adjusting Inventory


<!-- Page 164 -->

165
Chapter 4
Planning and Adjusting Inventory
In this chapter, you’ll start to plan your inventory. We’ll discuss planning 
strategies, cover the master data of production planning, and then dive 
deep into the SAP S/4HANA planning tool.
Before inventory processes can be executed, an organization needs to plan what inven-
tory to carry and where. When it comes to production planning, there are three major 
steps, and each step is associated with the recommended SAP Fiori apps, which will be 
discussed in detail in this chapter:
1. Managing production master data
Step 1 deals with activities related to production master data. Some production mas-
ter data originates in production engineering and therefore isn’t covered in detail 
here. The relevant apps and transactions are as follows:
– Manage Work Center Capacity (F3289)
– Display BOM (Transaction CS03)
– Display Routing (Transaction CA03)
– Display Master Recipe (Transaction C203)
2. Make to order (MTO) and make to stock (MTS)
Step 2 is about creating planned independent requirements (PIRs), whereas require-
ments based on sales orders are created in sales and distribution. The relevant app is 
as follows:
– Manage Planned Independent Requirements (F3445)
3. Material requirements planning (MRP)
Step 3 lists all the direct planning activities, such as monitoring material coverage/
shortages, monitoring internal and external requirements, scheduling and evaluat-
ing MRP runs, converting planned orders/purchase requisitions, and handling excep-
tions. The relevant apps are as follows:
– Monitor Requirements and Material Coverage (F0247)
– Manage/Convert Planned Orders (F4171)
– Schedule MRP Runs/Display MRP Key Figures/Display MRP Master Data Issues
(F1339, F1426, F1425A)
– Monitor External/Internal Requirements (F0246, F0263)
– Detect Unnecessary Supply Elements (F3853, see also SAP Note 2733550)


<!-- Page 165 -->

4 Planning and Adjusting Inventory
166
As explained in Chapter 2, Section 2.2, SAP S/4HANA includes role templates to help cus-
tomers quickly enable the end user to effectively use the SAP Fiori apps. This chapter 
deals with the production planner (SAP_BR_PRODN_PLNR). Production planners track 
materials and inventory, ensuring that materials are available when they are needed 
and that a sufficient value of inventory is maintained. They also are in charge of the pro-
duction schedule, purchase requisitions, and production orders. If the inventory falls 
below a necessary value and can’t meet material demand, typically an MRP run will cre-
ate planned orders as needed. However, in special cases that can’t be solved automati-
cally, the production planner must step in.
 
Note
As explained in Chapter 2, the production planner can be supported by the inventory 
analyst to analyze and monitor strategic challenges in inventory management. This is 
the connection between the analysis phase and the plan and adjust phase in Chapter 2. 
Although the SAP Fiori apps described so far offer analytical capabilities, the strategic 
analysis is carried out by different tools, which are all described in Chapter 8.
This chapter introduces different planning strategies and provides step-by-step instruc-
tions for how to use SAP Fiori apps in SAP S/4HANA for capacity planning, MTO and 
MTS, MRP, demand-driven material requirements planning (DDMRP), and Kanban to 
match demand with supply and adjust each. We’ll close with a look at new and upcom-
ing functionalities.
4.1    Planning Strategies
Usually, organizations do their planning with a time horizon in mind. Long-term plan-
ning takes into account business development strategy, marketing, and long-term 
product strategies. Midterm planning is about executing these strategies based on the 
long-term planning forecast.
SAP Integrated Business Planning (SAP IBP) is used for long-term and midterm plan-
ning if your supply chain planning strategy is implemented outside the SAP S/4HANA 
instance. We’ll discuss SAP IBP in more detail in Chapter 9, Section 9.4.1.
Short-term planning is started by MRP in SAP S/4HANA. If required, capacity require-
ment planning (CRP) and production planning/detailed scheduling (PP/DS) is used to 
further break down the MRP output into more detailed operations in SAP S/4HANA. 
Eventually, a manufacturing execution system (MES) is used to execute, monitor, and 
confirm the production. This book focuses on the MRP part of the planning, as it has the 
strongest impact on inventory management.
Figure 4.1 summarizes the interplay between the different planning horizons:


<!-- Page 166 -->

167
4.1 Planning Strategies
▪Long-term planning
Falling under sales and operation planning, long-term planning can be done using 
SAP IBP or legacy software. The output of long-term planning feeds the midterm 
planning.
▪Midterm planning
Also falling under sales and operation planning, midterm planning can be fulfilled 
by sales and operation planning, SAP IBP, predictive MRP, or legacy software.
▪Short-term planning
Short-term planning is executed by MRP, CRP, PP/DS, and production execution.
Figure 4.1  Planning Horizons
 
Note
You can feed PIRs as results of a legacy-based planning process into SAP S/4HANA with 
the appropriate interface (see Chapter 3).
We’ll walk through the key planning strategies in the following sections.
4.1.1    Production Planning
When it comes to inventory management, there are several production planning strat-
egies to choose from. The main strategies are as follows:
▪Make to stock (MTS)
The output of the production process is stocked because it’s not linked to a concrete 
customer requirement. Therefore, planning is often done based on forecasts.
Long-Term
Planning
Midterm
Planning
Short-Term
Planning


<!-- Page 167 -->

4 Planning and Adjusting Inventory
168
▪Assemble to order (ATO)
The output of the production process with a low vertical integration is linked to a cus-
tomer requirement based on a limited subset of product variants.
▪Make to order (MTO)
The output of the production process with a high vertical integration is linked to a 
customer requirement based on various product variants.
▪Engineer to order (ETO)
The output of the production process with a high vertical integration is engineered 
according to an individual single customer requirement.
Figure 4.2 shows the key factors influencing your production planning strategy and 
hence also your inventory situation. The listed planning strategies are closely linked to 
the following factors:
▪Production variants
How many different variants of one product do you plan to offer to your customers?
▪Production volume
How many finished products do you plan to sell in the market?
▪Value per product
How much value do you generate with each product?
▪Production trigger
What business model are you using to sell your product to the market?
Figure 4.2  Planning Strategies
In addition to your go-to-market strategy, another factor that influences your produc-
tion planning strategy is the service-level agreement (SLA) you offer to your customers 
or, in other words, the market lead time of your finished goods.
Key Factor
Make-to-Stock
Assemble-to-
Order
Make-to-Order
Engineer-to-
Order
Product
Variants
Production
Volume
Value per
Product
Production
Trigger
Forecast or
Service-Level
Agreement
Sales Order
Sales Order
Sales Order


<!-- Page 168 -->

169
4.1 Planning Strategies
Figure 4.3 explains how the total production lead time is calculated by the maximum 
replenishment lead time within all components, plus the production time of the fin-
ished good. If total production lead time is greater than the SLA (i.e., market lead time), 
you’ll opt for an MTS planning strategy or risk your SLA. If the total production lead time 
is shorter than your SLA, you have the choice to plan with MTS or MTO/ATO strategies.
Figure 4.3 also outlines that the planning strategies within the supply chain of one fin-
ished good might vary. As shown, one option to shorten the total production lead time 
and increase the SLA is to stock semifinished goods within the supply chain (SA3 in 
Figure 4.3), which are on the critical path. Hence, you decouple the production of fin-
ished goods from the availability of M3.
Figure 4.3  SLA and Lead Time Influencing the Planning Strategy
The production planning strategies outlined so far exist in theory. In real life, however, 
you’ll often plan with a combination of different planning strategies:
▪For example, if you would like to boost your market share with a special promotional 
variant of your original product, you’ll plan this with an MTS strategy.
▪If you have a complex supply chain network, you can plan the finished product with 
MTO, but some components used in several product variants are planned with MTS.
▪Consumer behavior may influence planning strategies. For example, some custom-
ers want to configure their desired car individually with the help of configurations 
tools, resulting in an MTO planning strategy. Others simply buy the car model dis-
played in the car shop “off the shelf,” which is planned according to an MTS strategy.
In fact, SAP S/4HANA supports these hybrid scenarios as you can plan each material 
with a different planning strategy. As we’ll see in Section 4.8, SAP S/4HANA explicitly 
t
FG
SA1
SA2
M1
M2
SA3
M3
Total lead time
Market lead time
Legend:
FG: Finished good
SA1, 2, 3: Subassembly
M1, 2, 3: Material
Inventory required
MTO, if product has
customer-specific
configuration
Production on
demand, if supported
by market lead time
Reorder point
planning, MTS, and
stable demand apply 
Dependent requirement
MTS with planning
against forecast


<!-- Page 169 -->

4 Planning and Adjusting Inventory
170
supports the idea of demand-driven replenishment as a special kind of hybrid planning 
strategy with an intelligent automation-based decoupling strategy.
4.1.2    Discrete versus Process Manufacturing
SAP S/4HANA distinguishes between discrete and process industries in production 
planning. Discrete manufacturing is the production of distinct items (automobiles, 
smartphones, etc.), whereas process manufacturing yields undifferentiated products 
(chemicals, food, oil, etc.). Some of the differences are mainly in terminology. Naturally, 
some differences reside in the configuration (see Chapter 3), and some differences are 
in the created documents; for example, each planned order can be converted into a pro-
duction order or a process order.
4.1.3    Demand-Driven versus Plan-Driven Planning
Demand-driven planning implies there is a concrete product demand out of the sales 
process that triggers the manufacturing process. In SAP S/4HANA, this is, for example, 
a sales order item on the finished good level (i.e., primary demand). Planning of a sales 
order item may result in dependent requirements (i.e., secondary demand), which are 
needed to assemble the finished product (see Figure 4.4).
Figure 4.4  Sales Order Item of Finished Good Creates Dependent Requirements
Sales orders can be created in SAP S/4HANA automatically by the sales process, or the 
demand can be entered manually (Section 4.6).
Plan-driven planning, on the other hand, implies that the manufacturing process is trig-
gered based on a previously created plan. This plan is created based on calculated fore-
casts, and its creation normally follows three general steps, as shown in Figure 4.5:
Desktop PC with Monitor
Desktop PC Components
1X Monitor + Cable
1X Desktop Case
1X Mainboard
1X Power Supply + Cable
1X CPU (Microprocessor X)
4X 5 GB DRAM
2X Hard Disc Drive 1 TB
1X Optical Disc
1X Keyboard + Cable
1X Mouse + Cable
1X High-End Graphics Card
Dependent Requirements
Sales Order Item


<!-- Page 170 -->

171
4.1 Planning Strategies
1. Forecast is collected for a defined time frame on an abstract level based on a previ-
ously agreed algorithm.
2. Forecast is distributed based on an applicable formula between products and produc-
tion intervals.
3. Planned primary demands are converted into PIRs per production interval.
Figure 4.5  Converting a Forecast into PIRs (Schema on Left; Example on Right)
If desired, the SAP S/4HANA system can be configured so that the forecast in a given 
time period is matched against incoming sales orders. Thus, the forecast consumption
can be monitored. If there is a surplus at the end of the time period, the forecast was too 
high (example in Figure 4.6); if there is a negative difference, the forecast was too low.
Figure 4.6  Forecast Consumption by Matching Sales Orders Against the Forecast
Annual
Forecast
Create PIRs
• Convert forecast into PIRs
• Distribute total annual forecast per product and
   production interval
• Calculate total annual forecast per product group
Product and
Seasonal
Breakdown
600
Forecast
Sales Order 1
Sales Order 2
Sales Order 3
Sales Order 4
Sales Order 5
Non-Consumed Forecast
500
500
-20
-40
-60
-70
225
-50
400
300
200
100
0


<!-- Page 171 -->

4 Planning and Adjusting Inventory
172
SAP S/4HANA offers several functionalities, such as sales and operations planning, to 
generate input for plan-driven manufacturing and to monitor and adjust the execution 
of such plans.
4.2    Production Master Data Overview
Before we start with production planning, let’s begin with the master data. In this sec-
tion, we’ll define the master data elements and provide an overview of their relationship:
▪Bill of materials
A bill of materials (BOM) is a component hierarchy comprising all components 
needed to assemble the finished product (see Figure 4.7). BOMs can have a different 
usage and can have more than one alternative describing product variants. Each 
node of the hierarchy—also called the subassembly—has its own BOM number and 
can be referenced by different BOMs. In some cases, these references become recur-
sive (most likely in process industries).
The example in Figure 4.7 sketches the BOM of the desktop PC ordered in Figure 4.4. 
The subassembly (mainboard) could also be part of another BOM belonging to differ-
ent finished products. Each BOM has a validity, and its lifecycle is normally main-
tained in a product lifecycle management (PLM) function. Section 4.5.2 explains the 
SAP Fiori apps to display and explore BOMs. Naturally, BOMs are used in DDMRP to 
identify the best decoupling points, as described in Section 4.8.
Figure 4.7  Desktop PC Shown as a BOM
▪Work center/resource
Work centers (in process industries, the term resource is used instead) represent 
machines, employees, or production lines as master data objects in production plan-
ning. Work centers are used in routings and carry information to calculate schedul-
ing and capacity (Section 4.5).
Desktop PC
Mainboard
CPU
DRAM
High-End
Graphics
Card
Case
Hard Disk
Optical Disk
1
1
1
1
1
2
5
Finished Product
Component Quantity
Subassembly
Component


<!-- Page 172 -->

173
4.3 MRP Overview
▪Routing/master recipe
Routing (in process industries, the term master recipe is used instead) defines how 
you process work on the floor. Routing is composed of a series of operations, also 
called routing steps. Each step is linked to a work center. Routing management is 
explained in Section 4.5.
▪Production version
The production version is the link between the BOM alternative and routing/master 
recipe. Production versions may be time dependent and lot size range dependent. 
You can also assign a storage location where the produced material is stored. Produc-
tion versions are used in MRP and sales and operation planning.
▪Production supply area
The Production Supply Area (Fast Entry) app (Transaction PK05S) and the Manage 
Production Supply Area app in SAP Fiori allow the creation and addition of produc-
tion supply areas required for planning with Kanban (Section 4.4 and Section 4.9). 
The production supply area is linked to a storage location.
4.3    MRP Overview
MRP describes a process that explores independent requirements and creates depen-
dent requirements based on different algorithms using the production master data 
explained in Section 4.2.
Input to MRP can be PIRs or sales orders of goods, which you plan to sell to your cus-
tomers. To plan your finished good, you need to maintain a set of information in the 
system:
▪Material master entry of the finished good, including planning strategy
▪BOM of the finished good describing all its components and subassemblies or an 
external source of supply
▪Routing describing the tasks to assemble the finished good
▪Material master entry of all components and subassemblies describing their subas-
semblies, components, and routing
Overall, you need a nested description of where to get all the components of your fin-
ished goods and how to assemble them. Nesting terminates in the moment a compo-
nent is procured externally.
MRP calculates which components are needed and determines which sequence to use 
for each finished good, based on the preceding description and required resources 
needed to assemble the components when fulfilling the PIR/sales order. As the inter-
mediate output, planned orders or purchase requisitions are created, which are con-
verted into production orders and purchase orders, respectively, or they can create 
dependent requirements that are fed into the MRP process again. Eventually, the result


<!-- Page 173 -->

4 Planning and Adjusting Inventory
174
of this multistep planning process is a set of purchase orders for external procurement 
and a set of production orders for in-house production.
4.3.1    Generic Capabilities
All SAP Fiori apps in production planning offer generic capabilities, although a few are 
only available for specific SAP Fiori apps. You’ll see the following capabilities pop up 
throughout the chapter:
▪Area of responsibility
With the area of responsibility, all SAP Fiori apps offer a common tool to end users 
so they can personalize their working environment. Each end user must define the 
pairs of plant and MRP controllers they want to use in data selection. If you miss the 
MRP controller in an SAP Fiori app, you can easily use data source extensibility to add 
it (see Chapter 3, Section 3.3.5).
▪Quick views
With quick views, end users can start a quick inspection of objects such as MRP ele-
ments or master data by clicking the visible link. Quick views also include additional 
navigation targets connected to the inspected object.
▪Variant management
All simple lists offer variant management to end users so they can create personal-
ized selection/layout variants for specific tasks. Variants can be private or public 
(shared).
▪Notes
Many objects support end users in taking notes and displaying note history to doc-
ument business decisions.
▪Change management
An end user can activate change management so that changes to purchase orders 
must be requested and approved by the vendor.
▪Open related SAP Fiori apps
Based on the end user authorizations, additional context-sensitive navigation tar-
gets (SAP Fiori apps) are offered for problem solving.
4.3.2    Planning Process
Figure 4.8 outlines the entire planning process via MRP. In the upper-right corner, the 
input to MRP is shown (PIRs, sales orders, and dependent requirements). In the lower 
part, the output of MRP (production orders and purchase orders) is shown.
During a planning run, MRP matches the required stock against the existing stock to 
calculate the net requirements (upper part of Figure 4.9).


<!-- Page 174 -->

175
4.3 MRP Overview
Figure 4.8  Short-Term Planning Schema with Plan-Driven and Demand-Driven Strategies
Figure 4.9  MRP Strategies
PIR
Planning
Strategy
Inventory
Situation
BOM
Explosion
Dependent
Requirements
Planned
Order 
Production
Order 
Purchase
Requisition
Purchase
Order
Demand
Planning
MRP
In-House
Production
External
Procurement
Sales Order
Sales and
Distribution
Plan-Driven
Demand-Driven
Process Flow: MRP
Input: Demand
Output: Net Requirements
Supplier
MRP
Procedure 
None
Deterministic
Master
Production
Scheduling
MRP
Stochastic
(Consumption-
Based)
Reorder Point
Forcast-Based
Time-Phased
Demand-
Driven
Demand
Supply
Planned Independent Requirements
Dependent Requirements
Stock
Fixed Receipts
Net Requirements Calculation
MRP Strategies: Overview
MRP Strategies: Algorithms
▪External Procurement (Purchase Requisition)
▪In-House Production (Production Order)


<!-- Page 175 -->

4 Planning and Adjusting Inventory
176
If the required component is procured externally, the output of MRP is eventually a pur-
chase requisition, which will be later converted into a purchase order. If the required 
component is produced internally, the output of MRP is a planned order, which will be 
eventually converted into a production order. The actual planning is done with differ-
ent algorithms (lower part of Figure 4.9), which can be subdivided into three groups:
▪Deterministic
▪Stochastic
▪Demand driven (Section 4.8)
A deterministic algorithm is based on the assumption that the quantity of the required 
material can be calculated according to the rules defined in the production master data 
(Section 4.2). The difference in the deterministic algorithm lies in the way the depen-
dent requirements are calculated and considered during the planning run.
A stochastic algorithm is based on the assumption that the quantity of the required 
material can be derived from consumption of the required material in the past. Unlike 
a deterministic algorithm, a stochastic algorithm is consumption based by reordering 
according to a set of rules, by taking forecast into account, or by using a time-phased 
approach.
In SAP S/4HANA, the MRP strategy is determined by the MRP type assigned to the mate-
rial master record in the MRP Data view, as shown in Figure 4.10.
The MRP types starting with P or M represent deterministic planning strategies. 
Depending on the MRP type, additional fields, such as Planning Time Fence, must be 
maintained in Figure 4.10. MRP types starting with M define master production sched-
uling, whose algorithm creates dependent requirements only to the first BOM level, 
allowing planners to adjust the intermediate result before all dependent requirements 
are planned.
MRP types starting with V or R represent the stochastic planning strategies. Reorder 
point (starting with V) is a simple algorithm, which creates planned orders if inventory 
stock falls below a certain threshold, which is maintained as a Reorder Point in Figure 
4.10. Depending on the MRP type, the reorder point is maintained manually or calcu-
lated automatically. A time-phased planning strategy starting with R requires the Plan-
ning Cycle field in the material master and ensures that the material is planned only in 
a designated time frame.
MRP types starting with D represent demand-driven replenishment strategies, which 
are explained in detail in Section 4.3.4.


<!-- Page 176 -->

177
4.3 MRP Overview
Figure 4.10  Material Master MRP View
4.3.3    MRP Live
MRP Live is a reimplementation of the classic MRP optimized for SAP S/4HANA with 
performance improvements and allows live planning of dedicated materials. MRP Live 
has stricter requirements for master data during planning. Hence, if planning with MRP 
Live fails, the system automatically tries to plan with classic MRP. If planning fails, an 
error code is generated. Section 4.7.6 gives some hints on how to deal with master data 
issues during MRP Live runs.
 
Further Resources
SAP Note 1914010 explains for each release the restriction for planning in MRP Live on 
SAP HANA.
4.3.4    DDMRP
The Demand Driven Institute (http://s-prs.co/v489203) defines DDMRP as the follow-
ing:
“... a formal multi-echelon planning and execution method to protect and promote 
the flow of relevant information.”
Essentially, DDMRP decouples the flow of semifinished goods at strategic steps of the 
supply chain by establishing dynamic material buffers. These buffers smooth any fluc-
tuations in material demand and reduce, for example, the bullwhip effect known in sup-
ply chain planning. DDMRP can be used in a broad range of business scenarios, such as 
MTO, MTS, component manufacturing, or subcontracting. One advantage of DDMRP is 
the ability to ensure high SLAs while keeping the inventory low. The key feature of 
DDMRP is dynamic buffer management based on historic figures, such as lead time or 
demand.
Figure 4.11 shows the execution cycle of DDMRP and how SAP S/4HANA supports the 
different steps.


<!-- Page 177 -->

4 Planning and Adjusting Inventory
178
Figure 4.11  Implementation of the DDMRP Methodology in SAP S/4HANA
Another advantage of DDMRP is that it can gradually be implemented as a replenish-
ment strategy without disturbing existing replenishment strategies. Only the materials 
identified to be buffered need to be switched to the DDMRP replenishment strategy. 
Section 4.8 describes in detail the SAP Fiori apps supporting the implementation of the 
DDMRP replenishment strategy in SAP S/4HANA.
4.4    Kanban Overview
Kanban was developed by Toyota and represents a material flow control system based 
on the pull principle (see Figure 4.12). All materials are transported in containers (bins) 
to the work center. If a container is emptied, its refill is triggered (pull).
Figure 4.12  Kanban Control Cycle
Replenishment
Planning
Buffer Sizing
(Operational)
Buffer Positioning
(Strategic)
Replenishment
Execution
Individualized
Demand-Driven
with Buffer
Ad Hoc Prod.
Material
Stock/
Stock Level
Stock+
Ordered
Proposed 
Order Qty
FIO-NAV-0815
3
13
30
FIO-PST-1501
6
16
15
FIO-MST-3006
55
135
0
FIO-PRD-0807
22
56
0
FIO-NAV-0101
23
23
127
FIO-NAV-0404
44
44
26
FIO-MST-0821
25
25
0
FIO-PRD-0822
88
88
0
Lead Time
Average Daily Usage
Classification
Analytics
(Including Basis for Feedback)
Lead Time
Average Daily Usage
…
Kanban
Demand
Kanban
Supply
Filled Kanban container moves to the 
work center demanding the Kanban.
Empty Kanban container moves to the
work center supplying the Kanban.


<!-- Page 178 -->

179
4.5 Capacity Planning and Production Master Data
In simple terms, Kanban is planning with a fixed lot size and a fixed reorder point. SAP 
S/4HANA defines two main categories of the Kanban control cycle. The first is the event-
driven Kanban control cycle, which means that Kanban containers are created on 
demand (e.g., triggered by an event). The second is the classical Kanban control cycle
with a predefined set of Kanban containers. There are three principal processes of Kan-
ban container replenishment in SAP S/4HANA:
▪External procurement
External procurement can be fulfilled by a purchase order, scheduling agreement, 
stock transport order, or summarized just-in-time (JIT) call (Section 4.9.2).
▪Transfer postings
Transfer postings are created by stock transfer reservation or direct material transfer 
postings, SAP Extended Warehouse Management (SAP EWM) deliveries, warehouse 
management transfer requirements, or warehouse tasks.
▪Internal production
Internal production is fulfilled by planned orders eventually to be converted into 
production orders.
A Kanban control cycle is always linked to a material, plant, and production supply area. 
From the inventory perspective, one Kanban control cycle is also tied to a storage loca-
tion (or destination bin if using SAP EWM) by its production supply area in which its 
stock quantities are listed. From the production perspective, one Kanban control cycle 
is linked to a work center, where its content is consumed. For a summarized JIT call as 
the replenishment process, a summarized JIT call profile is assigned to the control cycle.
Section 4.9 explains in detail how SAP S/4HANA supports production planning with 
Kanban.
4.5    Capacity Planning and Production Master Data
Before starting any planning activities, we need to take care of the production master 
data evaluated during planning. To begin, we’ll briefly discuss how the work center 
capacity is managed and production master data is maintained, before moving on to 
key SAP Fiori apps for BOMs and routing.
 
Note
For material master planning data, the material object page displays the details of one 
material master record. The sections related to external procurement are especially of 
interest for production planning.
You can quickly find the object page of a desired material by using enterprise search in 
SAP Fiori launchpad (see Chapter 1, Section 1.4.3).


<!-- Page 179 -->

4 Planning and Adjusting Inventory
180
4.5.1    Manage Work Center Capacity
The Manage Work Center Capacity app (F3289), shown in Figure 4.13, allows you to plan 
and adjust the capacity of work centers if the work center capacity is set to finite sched-
uling. You can detect overload situations and balance several factors to achieve optimal 
usage of the work center.
Figure 4.13  Capacity Center List
This is a draft-enabled simple list SAP Fiori app (see Chapter 1, Section 1.4.2), hence the 
filter criteria allow you to select for a certain Editing Status. You can select a simple list 
of work centers based on the work center itself, master data attributes, transaction data 
attributes, and administrative data. The Evaluation Horizon limits the time frame to 
look at in the future by offering several time buckets, and the Load Type allows you to 
filter for certain load conditions. The initial list displays the main attributes per work 
center and summarizes the Utilization as a micro chart.
Figure 4.14  Capacity Planning Details Page of a Work Center with Chart Overview


<!-- Page 180 -->

181
4.5 Capacity Planning and Production Master Data
Click the arrow icon at the end of the line item to access the work center capacity details 
page, as shown in Figure 4.14. The details page shows the Utilization as a chart/table. 
Selecting a chart column updates the Operations section below, which displays all oper-
ations within the selected time frame. If needed, you can focus exclusively on all over-
due operations by selecting Overdue in the Operations section in Figure 4.15.
The Shifts section (see Figure 4.15) shows all shifts starting with the first day of the dis-
played time frame. If you switch to edit mode by clicking the Edit button, you can edit 
the shifts of the work center. You can add (click the + icon), Delete, or edit existing shift 
intervals. When editing, you can change the Shift Utilization (i.e., net working time) or 
the Number of Capacities (i.e., number of parallel tasks per work center).
Figure 4.15  Capacity Planning Details Page of a Work Center with Operations and Shifts in 
Edit Mode
4.5.2    Display BOM, Display Multilevel BOM Explosion, and Find BOM for 
Components
The following SAP Fiori apps are used for detailed analysis and display of BOM informa-
tion during production planning. There are more advanced SAP Fiori apps for managing 
BOMs available to product engineers (not covered in this book).
The Display BOM app (Transaction C503) helps you display simple BOMs. On the entry 
screen shown in Figure 4.16, you must enter the Material, Plant, BOM Usage, and Alter-
native BOM (Section 4.2). The BOM structure is always time dependent.
After clicking Item, the results screen shown in Figure 4.17 displays all components of 
the BOM plus the BOM header information in detail. If you double-click a BOM Compo-
nent showing an assembly (i.e., the checkbox in the Asm column is enabled), you navi-
gate to the assembly.


<!-- Page 181 -->

4 Planning and Adjusting Inventory
182
Figure 4.16  Entry Screen to Display a BOM
Figure 4.17  Material BOM Components List
The next SAP Fiori app, Display Multilevel BOM Explosion (Transaction CS12), helps you 
explore all levels of a BOM from the top down. On the entry screen shown in Figure 4.18, 
you must enter Material, Plant, and BOM Application (normally, “PP01” for production-
general BOM).
After clicking the Execute button, the results screen shown in Figure 4.19 displays a hier-
archical list of all BOM levels.
The final SAP Fiori app for BOM information, Find BOM for Components (Transaction 
CS15), allows you to find all components of any BOM containing a dedicated material. 
You can explore a BOM one level up in the BOM hierarchy.


<!-- Page 182 -->

183
4.5 Capacity Planning and Production Master Data
Figure 4.18  Entry Screen to Explode a Material BOM
Figure 4.19  Material BOM Explosion to All Levels


<!-- Page 183 -->

4 Planning and Adjusting Inventory
184
On the entry screen shown in Figure 4.20, you enter the Material and select the Type of 
where-used list and the type of BOM to look at in the Used in options (Material BOM, in 
our example). You can access the view screen by clicking the View button in the upper-
left corner, where you can control the output (see Figure 4.21).
Figure 4.20  First Entry Screen Defining Search Criteria
Figure 4.21  Second Entry Screen Defining Output Criteria
After clicking the Execute button, the results screen shown in Figure 4.22 displays a sim-
ple list of all components in which the material is used.


<!-- Page 184 -->

185
4.5 Capacity Planning and Production Master Data
Figure 4.22  BOM Material Where-Used List
4.5.3    Display Routing/Display Master Recipe
The next two SAP Fiori apps we’ll discuss are used for detailed analysis and display of 
routing/master recipe information, respectively.
The Display Routing app (Transaction CA03) helps you display routing of a material. On 
the entry screen shown in Figure 4.23, you must enter a Material and Plant.
Figure 4.23  Entry Screen to Display Routing (Buttons in the Footer Not Shown)


<!-- Page 185 -->

4 Planning and Adjusting Inventory
186
After clicking the Continue button (not shown), the results screen shown in Figure 4.24 
displays the operations per work center of this particular material.
Figure 4.24  Material Routing
You can directly navigate to the Sequences, Operations, Allocation, and Work Center by 
selecting an item and choosing the appropriate menu entry (refer to Figure 4.23).
Figure 4.25  Entry Screen to Display the Master Recipe (Footer Buttons Not Shown)


<!-- Page 186 -->

187
4.6 Make to Order and Make to Stock
An additional app, Display Master Recipe (Transaction C203), helps you display the mas-
ter recipe of a material. On the entry screen shown in Figure 4.25, you must enter the 
Recipe Group (all recipes belonging to one production process) or a Material and Plant.
After clicking the Recipe Header button (not shown), the results screen shown in Figure 
4.26 displays the operations per resource of this particular recipe group/material.
Figure 4.26  Master Recipe with Operations and Materials
If you switch to the Materials tab, you can see the finished good and the BOM this recipe 
group is using.
4.6    Make to Order and Make to Stock
In this section, we’ll create some PIRs in case we have a plan-driven scenario (either MTO 
or MTS).
The Manage Planned Independent Requirements app (F3445) can be used to create and 
edit PIRs per material having a forecast indicator in the material master record. The ini-
tial screen shown in Figure 4.27 allows you to select the materials you want to edit 
according to several filter criteria, most notably the following:
▪Reach
Define the time horizon you want to look at.
▪Accuracy
Match the PIRs to the actual demands in the system.


<!-- Page 187 -->

4 Planning and Adjusting Inventory
188
▪Upload and Edit
Mass upload PIRs created externally in CSV format.
▪Create
Create different versions of one material’s PIR to reflect different sources of the PIR.
Figure 4.27  Simple List to Maintain PIRs
You can navigate to a details page for each entry by clicking the arrow icon to arrive at 
the screen shown in Figure 4.28. Here, you can see the PIRs of materials and compare 
PIRs to sales quantity.
Figure 4.28  Details Screen after Navigation


<!-- Page 188 -->

189
4.6 Make to Order and Make to Stock
If you click the Edit button in Figure 4.27, you’ll arrive at the screen shown in Figure 4.29, 
where you can change the PIR quantities in the PIRs column.
Figure 4.29  Editing Screen
Alternatively, in Figure 4.27, you can select the checkbox for one or many entries and 
start mass editing directly on the entry screen (via the Edit button). This will lead you to 
the Mass Maintenance screen, as shown in Figure 4.30.
Figure 4.30  Mass Maintenance Screen
Once you click the Mass Maintenance button, you have the following three options for 
your Proposed Quantity after selecting the period you want to change (see Figure 4.31):
▪Copy from Reference Material
Enter a reference material, and the PIRs of this reference material are transferred 
during mass maintenance.
▪Enter Quantity
Enter a quantity, which is transferred during mass maintenance.
▪Forecast Quantity
The quantity calculated by a forecast is transferred.
 
Note
In addition to the Manage Planned Independent Requirements app, there are two addi-
tional SAP Fiori apps called Create Planned Independent Requirements and Change 
Planned Independent Requirements for detailed operations on PIRs that aren’t covered 
by the Maintain PIRs app, such as schedule lines.


<!-- Page 189 -->

4 Planning and Adjusting Inventory
190
Figure 4.31  Mass Maintenance Popup
4.7    MRP Live
We’ll now start to plan according to the planning strategies outlined in Section 4.1. Ini-
tially, we’ll discuss how MRP Live interactively supports planning and propose solu-
tions for material coverage issues. Then, we’ll cover how to set up regular planning runs 
in batch mode and how to evaluate the results. Finally, we’ll discuss how to monitor 
requirements and how to be automatically notified of requirement changes.
4.7.1    Monitor Requirements and Material Coverage
The Monitor Material Coverage (F0251) and Monitor Material Coverage – Net Segments
(F0247A) apps form the cornerstone of all planning-related activities in SAP S/4HANA. 
As shown in Figure 4.32, you get a supply/demand overview per material. 
Figure 4.32  Monitor Material Coverage in the Center of All Planning Activities
Monitor
Material
Coverage
Material
Master
MRP Live
Planning
Supply/
Demand
Overview
Notes,
Context-
Sensitive
Actions


<!-- Page 190 -->

191
4.7 MRP Live
You can inspect the material master, execute immediately an MRP Live planning run, 
or use the system proposals/context-sensitive action to solve a critical situation. You 
can document all actions by note taking.
 
Note
In contrast to SAP ERP-based planning transactions like Transaction MD06, the SAP Fiori 
app Monitor Material Coverage isn’t based on the results of the last MRP run but rather 
displays real-time data.
There is then a further divide between two SAP Fiori apps (shown in Figure 4.33 and 
Figure 4.34): Monitor Material Coverage – Net Segments and Monitor Material Coverage 
– Net/Individual Segments. Material Coverage – Net Segments doesn’t show the demand 
element (e.g., a sales order), and Material Coverage – Net/Individual Segments displays 
the demand element in the Individual Segment column (see Figure 4.34). The second app 
is therefore ideally used in an MTO production planning scenario.
Figure 4.33  Comparing Both Material Coverage Apps (Monitor Material Coverage – 
Net Segments)
Figure 4.34  Comparing Both Material Coverage Apps (Monitor Material Coverage – 
Net/Individual Segments)


<!-- Page 191 -->

4 Planning and Adjusting Inventory
192
Let’s take a closer look at the key aspects of these apps.
Area of Responsibility
Both applications offer the end user a personalized view of the core planning-related 
activities by defining an area of responsibility (combination of plant and MRP con-
troller).
You can access the app’s personalization in the Me Area of the SAP Fiori launchpad (see 
Chapter 1, Section 1.4.3). Here, you can set your area of responsibility, as shown in Figure 
4.35, by clicking the Application Settings button (not shown). Here you can see the com-
binations of Plant and MRP Controller, which are activated for your end user. This 
assignment is taken into account by displaying only items where the area of responsi-
bility status fits, for instance in the Monitor Material Coverage app.
Figure 4.35  Area of Responsibility Setup
 
Note
If the selected materials displayed in the Monitor Material Coverage app don’t meet 
your expectations, check your Area of Responsibility settings.
Both the Monitor Material Coverage – Net Segments and Monitor Material Coverage – 
Net/Individual Segments apps allow you to filter for all materials with net requirement 
segments having a shortage issue according to the selected shortage definition by your 
area of responsibility. They are designed according to the simple list pattern. You can 
click the Go button to see the result list (see Figure 4.36).


<!-- Page 192 -->

193
4.7 MRP Live
Figure 4.36  Monitor Material Coverage App: List of Materials with Shortages
Stock Availability Views
The following Shortage Definitions (refer to Figure 4.34) are available:
▪MRP Standard
Compares all receipts with all requirements. Shortage means available stock is below 
safety stock level or below zero.
▪Stock Days’ Supply
Compares stock with planned requirements. Shortage means available stock is below 
zero. If available stock is below safety stock, the period is critical.
▪Ordered Requirements
Compares planned receipts with ordered requirements. Shortage means available 
stock is below zero. If available stock is below safety stock, the period is critical.
▪Ordered Receipts
Compares planned requirements with ordered receipts. Shortage means available 
stock is below zero. If available stock is below safety stock, the period is critical.
With the Shortage Evaluation Period filter criteria dropdown, you can define the time 
period to look at. There are some predefined time periods, such as Material Replenish-
ment Lead Time, Total Replenishment Lead Time, 7 Days, 14 Days, and so on.
The chart settings can be configured by Horizon and Number, as shown in Figure 4.37, 
by clicking Configure Chart (small chart icon on top of table).


<!-- Page 193 -->

4 Planning and Adjusting Inventory
194
Figure 4.37  Configure Chart of Stock Availability
MRP elements or master data are displayed as links that offer a quick inspection of each 
object, including additional navigation targets. Here, the Material Number can be 
clicked to access a quick view. Quick views of materials and vendors allow you to assess 
stock availability, material master data, and vendor master data with one click (see 
Figure 4.38).
Figure 4.38  Quick View of Stock Situation and Material Master Data


<!-- Page 194 -->

195
4.7 MRP Live
After selecting rows, you can click the Start MRP Run button to schedule an MRP run
with the selected materials (Section 4.7.4) or click the Revoke Acceptance of Shortages
button to remove any previously accepted shortage to find a new solution. Clicking the 
Manage Materials button takes you to the worklist of the Material Coverage app 
(F0251A) containing the selected materials of Figure 4.36 on the left-hand side, as shown 
in Figure 4.39. The Material Coverage app is a successor app of a former Manage Material 
Coverage app (F0251). The new version is based on SAP Fiori elements and offers an opti-
mized lock and feel.
Figure 4.39  Worklist Material Coverage with Details
For each selected material in the worklist, you see details in three tabs:
▪Stock/Requirements List
This tab can be displayed in detail (see Figure 4.39) and in an aggregated format (not 
shown).
The Stock/Requirements List details offers you quick views for the displayed MRP ele-
ments, as shown in Figure 4.40, or quick actions, as shown in Figure 4.41, depending 
on the context and your authorizations. You can also change the view of your MRP 
element, as shown in Figure 4.42. Later in this section, we’ll discuss how to convert 
planned orders into production orders, which is mandatory to complete the plan-
ning process as described in Section 4.3.


<!-- Page 195 -->

4 Planning and Adjusting Inventory
196
Figure 4.40  Quick View on MRP Element (Planned Order at Right and Production Order at Left)
Figure 4.41  Available Actions on Single MRP Elements
Figure 4.42  Change View of MRP Element


<!-- Page 196 -->

197
4.7 MRP Live
▪Material Information
This tab summarizes all planning-relevant data of the selected material, such as Stock 
Availability, MRP Data, and Material Data, as shown in Figure 4.43.
Figure 4.43  Material Information
▪Notes
This tab allows you to take notes to document any decisions, as shown in Figure 4.44. 
Many objects support the end users in taking notes and displaying the note history 
to document business decisions.
Figure 4.44  Note-Taking Option
If you need more detailed information on a selected material, clicking the Related 
Actions button, shown earlier in Figure 4.38, allows you to navigate to the stock require-
ments list (Section 4.7.7) or the material object page (which we mentioned at the begin-
ning of Section 4.5).


<!-- Page 197 -->

4 Planning and Adjusting Inventory
198
Managing Shortages
Several options are available to solve a shortage situation. Returning to the original 
screen in Figure 4.36, you can do the following:
▪You can click the Start MRP Run button to resolve the shortage.
▪You can click the Accept button (not shown) to accept the shortage.
▪You can follow the proposals of the system, navigating through the views shown 
from Figure 4.45 through Figure 4.48.
▪You can use the rescheduling options offered by the system.
Figure 4.45  Material Shortage with Solution Proposal (Rectangle)
Let’s walk through the automatic proposal process. Figure 4.45 displays a material short-
age with a solution proposal from the system, which you can access by clicking the 
arrow icon.
When you click the solution proposal in the Available column (highlighted in Figure 
4.45), you’ll be directed to the Material Shortage screen shown in Figure 4.46. You can 
see the MRP Element that causes the shortage and the MRP Element proposed to solve 
the shortage, including a Rating in brackets below.
Figure 4.46  Solution Proposal: Tabular View
With the Simulate button, you can mimic the proposed solution within the Shortage
list. Figure 4.47 outlines the simulated solution (graphical view switched on).


<!-- Page 198 -->

199
4.7 MRP Live
If you choose Accept on the tabular view (not shown), the proposed solution can be cre-
ated with prepopulated attributes in the Create Purchase Requisition screen, as shown 
in Figure 4.48. Here, you can create the document by clicking the OK button.
Figure 4.47  Solution Proposal after Simulation: Graphical View
Figure 4.48  Realizing the Solution Proposal


<!-- Page 199 -->

4 Planning and Adjusting Inventory
200
Let’s look at another solution pattern, the rescheduling check. Rescheduling means the 
system proposes changing the scheduling of an existing MRP element instead of creat-
ing a new one. The rescheduling check proposes actions for the MRP element based on 
the following exception messages:
▪Reschedule in
Reschedule the MRP element to an earlier delivery date, indicated by the arrow but-
tons in Figure 4.49. Once clicked, you’ll arrive at the lower screen shown in Figure 
4.49.
Figure 4.49  Changing the Purchase Order Item with Change Management Offered as a 
Rescheduling In Option
 
Further Resources
See SAP Note 25388 for detailed documentation regarding exception messages.
▪Reschedule out
Postpone the delivery date of the MRP element, indicated by the arrow buttons in 
Figure 4.50. Once clicked, you’ll arrive at the lower screens shown in Figure 4.50.


<!-- Page 200 -->

201
4.7 MRP Live
Figure 4.50  Changing the Planned Order Offered as Rescheduling In (Upper Part) and 
Rescheduling Out (Lower Part) Option
▪Plan process according to schedule
MRP can’t plan to meet the schedule, and manual intervention is required.
▪Cancel process
Cancel the MRP element by clicking the trash icon (highlighted Figure 4.51).
Figure 4.51  Cancellation Offered as a Rescheduling Option with the Refresh Toolbar Button 
Highlighted


<!-- Page 201 -->

4 Planning and Adjusting Inventory
202
▪Excess stock
Planned stock is higher than the maximum stock setting (not shown).
▪Excess individual segment
Individual receipt segment exceeds actual demand (not shown).
Convert Planned Orders into Production or Process Orders
The Monitor Material Coverage app can also be used to convert planned orders into pro-
duction or process orders so that the planning process is completed.
The worklist shows all selected materials (refer to Figure 4.39). The details per material 
on the right-hand side allow the conversion of the material’s planned orders by choos-
ing Edit • Convert.
The subsequently displayed modal window shown in Figure 4.52 allows you to choose 
either Convert to Production Order or Convert to Process Order as the conversion target. 
Click the OK button to apply the change.
Figure 4.52  Conversion of Planned Order into Production Order or Process Order
We’ll discuss converting planned orders in more detail using alternative apps in Section 
4.7.3.
4.7.2    Manage Planned Orders
Planned orders are in most cases created automatically as an output of the MRP process 
(Section 4.3). The Manage Planned Orders app (F4171) helps you manage the planned 
orders by selecting planned orders in the end user’s area of responsibility and offering 
navigation to Create, Firm, Convert to, or display orders (by clicking the Planned Order


<!-- Page 202 -->

203
4.7 MRP Live
number), as shown in Figure 4.53. You simply select the planned orders in the list and 
click the appropriate button in the toolbar to execute the action.
Figure 4.53  Simple List: Manage Planned Orders
4.7.3    Convert Planned Orders
To complete the MRP process, the created planned order must be converted into a pro-
duction order to initiate production execution (refer to Section 4.3). The Convert 
Planned Orders app (F4171) selects planned orders in the end user’s area of responsibility 
and displays them in a list, as shown in Figure 4.54. Here, you can navigate in each item 
to the relevant conversion application in the Action column. After selecting one or 
more items, you can trigger the following:
▪Collective Conversion to Production Orders
You can select several items and convert them to a production order.
▪Collective Conversion to Process Orders
You can select several items and convert them to a process order.
▪Collective Conversion to Purchase Requisitions
You can select several items and convert them to purchase requisitions.
Figure 4.54  Simple List: Convert Planned Orders
In addition to the SAP Fiori app just described, there are additional SAP Fiori apps that 
you can use if you need to perform the following changes not supported by the Monitor 
Material Coverage app (see Chapter 1, Section 1.4.2):


<!-- Page 203 -->

4 Planning and Adjusting Inventory
204
▪The Convert Planned Order to Production Order and Convert Planned Order to Pro-
cess Order apps are for detail operations on planned orders not covered by Monitor 
Material Coverage, such as changing fields other than Quantity and Delivery Date.
▪The Convert Planned Orders to Production Orders, Convert Planned Orders to Pro-
cess Orders, and Convert Planned Orders to Purchase Requisitions apps support col-
lective conversions of planned orders.
▪The Create Planned Order, Change Planned Order, and Display Planned Order apps 
support manual creation, change, and display of planned orders.
4.7.4    Schedule MRP Runs
The Schedule MRP Runs app (F1339) allows you to schedule MRP runs as background 
jobs. With this SAP Fiori app, you finally automate the execution of your planning strat-
egy implemented in the previous sections.
Figure 4.55 shows the entry screen for the Schedule MRP Runs app, where you see a sim-
ple list of all MRP jobs. You can use the filter bar to select specific attributes and time 
frames. The list indicates whether the job is Scheduled or Finished.
Figure 4.55  Entry Screen of Schedule MRP Runs
Access the details screen for each list entry by clicking the arrow icon of the list item. You’ll 
arrive at the screen shown in Figure 4.56, where you can see all details of the defined job. 
The Scheduling Options and Run Details sections display administrative job data.
Figure 4.56  Job Details: Scheduling Options and Run Details


<!-- Page 204 -->

205
4.7 MRP Live
The Parameter Section, shown in Figure 4.57, contains the control attributes of the MRP 
job:
▪Planning Scope
The Planning Scope section helps you to define the set of materials to be planned. 
Notably the Material Scope helps you plan all materials (A), materials only with MRP 
types of master product scheduling type (M), or materials not having an MRP type of 
master product scheduling type (S).
▪Regenerative Planning
If the Regenerative Planning indicator isn’t set, only net changes are planned during 
an MRP run.
▪Scheduling
Scheduling affects the created/changed planned orders during an MRP run and 
allows you to switch between determination of basic dates for planned orders (1) or 
lead time scheduling and capacity planning (2).
▪Planning Mode
Planning Mode affects unconfirmed procurement proposals of former MRP runs. 
You can either delete and recreate procurement proposals or adapt existing ones.
▪Changed BOM Components
If the Changed BOM Components indicator is set, the MRP run also plans the depen-
dent requirements of the planning scope irrespective of the plant.
Figure 4.57  Job Details: Parameter Section


<!-- Page 205 -->

4 Planning and Adjusting Inventory
206
▪All Order BOM Components
If the All Order BOM Components indicator is set, the MRP run also plans the depen-
dent requirements of all order BOMs regardless of whether they are in the Planning 
Scope.
▪Stock Transfer Materials
If the Stock Transfer Materials indicator is set, the MRP run also plans the dependent 
requirements in supplying plants in which a stock transfer is created regardless of 
whether they are in the planning scope. You can adapt the existing planning data (1) 
or delete the old and recreate new planning data (3).
▪Output Material List
The Output Material List indicator creates a list of all planned material within the job 
log if set.
To create a new job, click the Create button in the screen shown in Figure 4.55, which 
opens the screen shown in Figure 4.58. Enter the job parameters (Job Template and Job 
Name).
Figure 4.58  Job Creation Screen
The Scheduling Options allow you to define the job execution parameters. With the 
Define Recurrence Pattern option, you can modify the timing of the job execution rep-
etition.
The Parameters section allows you to select the Planning Scope and to pass some Con-
trol Parameters to the job. It’s mandatory to enter at least one selection criteria within 
the Planning Scope.
You can validate your input with the Check button, Schedule the execution, or save your 
input as a Template for further usage.
Each scheduled job can be monitored using the Display MRP Key Figures app (see the 
next section).


<!-- Page 206 -->

207
4.7 MRP Live
4.7.5    Display MRP Key Figures
After scheduling your planning runs, you may want to track their execution and check 
their result. The Display MRP Key Figures app (F1426) allows you to monitor the jobs cre-
ated with the Schedule MRP Runs app (discussed in Section 4.7.4). You’ll be able to track 
the execution of your planning strategy by the MRP.
After entering the SAP Fiori app, you’ll see a simple list of all scheduled MRP jobs in 
Figure 4.59. You can use the filter bar to select specific attributes. The Run Status indi-
cates whether the job has finished successfully or not.
Figure 4.59  List of MRP Jobs and Status
You can access the details screen by clicking the arrow icon of a selected item. You can 
see the following sections for each job:
▪Information
This section, shown in Figure 4.60, gives general runtime information, the settings 
used to schedule the job, the number of planned materials, and the job data.
Figure 4.60  Job Details: Technical Details


<!-- Page 207 -->

4 Planning and Adjusting Inventory
208
▪Run History
This section, shown in Figure 4.61, displays a line chart of the planned materials and 
of those whose planning failed during the runtime.
Figure 4.61  Job Details: Run History and Low-Level Code Steps
▪Low-Level Code Steps
This section, shown at the bottom of Figure 4.61, shows a table of all low-level code 
steps. Click a table item to access the details screen (not shown).
▪All MRP Live Steps
This section in Figure 4.62 shows a table of all MRP Live steps. Click the arrow icon of 
a selected item to access a details screen (shown in Figure 4.63), which shows the 
planning statistics of the MRP Live step.
Figure 4.62  Job Details: MRP Live Steps


<!-- Page 208 -->

209
4.7 MRP Live
Figure 4.63  Details of MRP Live Step
4.7.6    Display MRP Master Data Issues
If your MRP runs encountered master data issues, you may want to inspect them. The 
Display MRP Master Data Issues app (F1425A) allows you to view the results of MRP Live 
planning runs and analyze any master data issues that occurred during MRP Live. Navi-
gation options help you drill down on the root cause of an issue to find a solution.
Figure 4.64 shows a list of MRP master data issues. If you click the arrow icon of a 
selected line, you navigate to the details screen of the issue (see Figure 4.65). You can 
mark single entries as Accepted or as Revoke Acceptance while progressing on the list 
entries. All input is refreshed with each MRP Live run.


<!-- Page 209 -->

4 Planning and Adjusting Inventory
210
Figure 4.64  Simple List: Display MRP Master Data Issues
Figure 4.65  Simple List: Details of Selected Entry
4.7.7    Monitor External Requirements
As a production planner, you need to ensure that all external requirements needed 
during production execution are available on time. The Monitor External Require-
ments app (F0246) enables you to monitor uncovered requirements of materials based 
on sales orders or stock transport orders.
Using the Requirement Evaluation Period filter criteria shown in Figure 4.66, you can 
define the time frame to look at. The shortage is calculated by matching ordered 
demand against planned supply. The item status is visualized as an overview chart


<!-- Page 210 -->

211
4.7 MRP Live
(showing Open Quantity and Missing Quantity). You can quickly track and react to crit-
ical situations by selecting the desired item in the list shown in Figure 4.66 and clicking 
the arrow icon on the left-hand side of the result list to navigate to the work list shown 
in Figure 4.67.
The worklist displays four sections for each selected object. Figure 4.67 shows the tabu-
lar display of the Stock Requirements List, including any shortages.
Figure 4.66  Simple List: Monitor External Requirements
Figure 4.67  Worklist: External Requirements
Alternatively, you can click the graphical display icon to open the screen shown in 
Figure 4.68 (only in SAP S/4HANA Cloud Private Edition). The waterfall diagrams list the 
stock quantity changes of all MRP elements in Figure 4.67 on a time axis with the option 
to select the displayed time frame with the slider at the bottom.


<!-- Page 211 -->

4 Planning and Adjusting Inventory
212
Figure 4.68  Section Stock/Requirements List: Graphical Display in SAP S/4HANA Cloud Private 
Edition
You have several options to resolve uncovered demands:
▪Click the Manage Material Coverage button (not shown) to navigate to the related 
app to initiate an MRP run for the particular material. MRP will try to find a solution 
based on the defined planning strategy.
▪Open a related SAP Fiori app to pursue a solution depending on your business role.
Other tabs in the Monitor External Requirements app include Material Information, 
which contains all material-related information such as MRP Data, Master Data, and 
Stock Availability; the Item Information, which created the requirement; and Notes, 
where you take notes to document any action taken.
4.7.8    Monitor Internal Requirements
As a production planner, you need to ensure that all internal requirements needed 
during production execution are available on time. The Monitor Internal Requirements 
app helps you to ensure that all internal requirements in your area of responsibility 
originating from production orders, process orders, maintenance orders, and network 
orders can be covered. The shortage definition is based on comparing planned receipts 
with ordered requirements.


<!-- Page 212 -->

213
4.7 MRP Live
Many objects offer quick views for rapid inspections. After starting the Monitor Internal 
Requirements app, you’ll see a simple requirement list in Figure 4.69 showing the most 
important data, such as Component, Quantity Overview (Open versus Missing), and 
Affected Order. You can navigate to a worklist for an item by clicking the arrow icon on 
the right-hand side.
Figure 4.69  Simple List: Monitor Internal Requirements
The Manage Internal Requirements worklist, shown in Figure 4.70, offers for each 
selected object similar sections as discussed for the Monitor External Requirements 
app.
Figure 4.70  Worklist: Selected Component in the Stock/Requirements List Section
The Stock Requirements List section allows you to solve open issues. You have the fol-
lowing options:


<!-- Page 213 -->

4 Planning and Adjusting Inventory
214
▪If the system has a solution proposal for an issue, it will direct you to the Material 
Coverage app, described in Section 4.7.1, when you click an item (see Figure 4.70, first 
two items).
▪If you have the appropriate authorization, you can directly edit an MRP element 
(Actions column, not shown).
▪Additionally, you can choose to start the MRP run per material.
As with the Monitor External Requirements app, there is also a graphical display of the 
Stock/Requirements List available for SAP S/4HANA Cloud Private Edition. The waterfall 
chart shown in Figure 4.71 displays all MRP elements creating quantity changes in a 
selected time frame. You can change the time frame selection with the slider on the bot-
tom.
Figure 4.71  The Stock/Requirements List: Graphical Display in SAP S/4HANA Cloud 
Private Edition
Other tabs in the Monitor Internal Requirements app include Material Information, 
which contains all material-related information such as material master and material 
stock-relevant data; the Order Information tab, which shows your type of order and 
internal contact; and the Notes tab, where you take notes to document any action 
taken.


<!-- Page 214 -->

215
4.7 MRP Live
4.7.9    Detect Unnecessary Supply Elements
As mentioned in Chapter 2, situation handling enables you to automatically notify a 
defined set of end users of a condition detected in SAP S/4HANA business processes. 
This situation template supports you in detecting supply elements that are no longer 
required; for example, if a sales order is canceled, this situation detects all MRP ele-
ments that have been created to fulfill this sales order. In this case, the situation auto-
matically notifies the MRP controller.
The following exceptions are detected by the situation:
▪CAN (cancel process)
No requirements for a receipt element exist. To avoid unnecessary warehouse stock, 
the element should be reversed.
▪EXC (excess stock)
The planned available stock exceeds the maximum stock as specified, and/or the 
actual stock and the receipt elements exceed the requirements in the individual seg-
ment, such as MTO planning, individual project planning, direct production, or 
direct procurement.
As a prerequisite, you must define the MRP element to be taken into account in the IMG 
activity Define Rescheduling Check for Plan:
▪Firmed Planned Orders
▪Production Order
▪Fixed Purchase Requisitions
▪PO/SA Schedule Line
▪QM inspection lot
▪Shipping Notification
To create a situation, you need to first define the team (see Chapter 3, Section 3.3.2). The 
following setup attributes must be considered:
▪Team type: SMRPT
▪Team category: PPMRP
▪Member function (shipped): SMRPLAN
▪Function profile: SMRP
Figure 4.72 shows the definition of the team, and Figure 4.73 shows the assignment of 
team members. The Responsibility Definitions section helps to determine the correct 
team, and the Team Members identifies the end user within the team.
The situation is created as a copy of the situation template SAP_PP_MRP_MATERIAL_
EXCEPTION as a batch-triggered situation (see Chapter 3 for details).


<!-- Page 215 -->

4 Planning and Adjusting Inventory
216
Figure 4.72  Setting Up a Team of Team Category PPMRP
Figure 4.73  Assigning User to the Team
The definition of the situation display is shown in Figure 4.74 with situation type CAN
as the filter value. Figure 4.75 shows the lower part of the situation with the assignment 
of the team in Figure 4.72.
The situation needs input of the job “PPH_MRP_SITUATIONS_CREATE”, which can be 
scheduled using the Detect MRP Situations app, shown in Figure 4.76. You don’t need to 
provide any additional mandatory parameters, except the Scheduling Options, when 
you schedule a new job with the + icon.
Figure 4.77 shows a selected job details page after clicking the arrow icon of the selected 
item. You can provide optional parameters to restrict the created situations to a dedi-
cated Material, MRP Area, MRP Controller, or Plant.


<!-- Page 216 -->

217
4.7 MRP Live
Figure 4.74  Copy of the Situation Template SAP_PP_MRP_MATERIAL_EXCEPTION with 
Material Situation Type CAN
Figure 4.75  Assigning Teams with Member Function
Figure 4.76  Detect MRP Situations: Simple List with Jobs


<!-- Page 217 -->

4 Planning and Adjusting Inventory
218
Figure 4.77  Detect MRP Situations: Selected Job Details
Figure 4.78 shows the result for the end user defined in the team. The end user will get 
a notification in the SAP Fiori launchpad. Upon clicking the notification, the end user 
will be directed to the Material Coverage app (discussed in Section 4.7.1), where they can 
solve the issue and dismiss the situation.
Figure 4.78  Notification in SAP Fiori Launchpad with Subsequent Navigation to the Material 
Coverage App


<!-- Page 218 -->

219
4.8 DDMRP
4.8    DDMRP
In Section 4.3.4, we covered the rationale behind the DDMRP strategy. This section will 
help you set up and work with DDMRP. We’ll start with the multistep configuration pro-
cess to identify the position and the size of the buffers. To finish, we’ll cover the tools to 
monitor buffer performance.
4.8.1    Configuration Process
DDMRP requires some different configuration steps than you saw in Chapter 3, which 
we’ll cover in this section. For DDMRP, setting up is a cycle that is closely linked with 
execution. Setup isn’t a onetime effort but needs to be repeated on a regular basis to 
keep the DDMRP process in an optimal state. Therefore, most of the setup steps are 
highly automated. To find the optimal buffer position and buffer size, you classify your 
products of the supply chain first according to four dimensions (Section 4.8.3).
Four steps are required to complete this task:
1. All materials are classified according to value, BOM usage, and demand variability 
(Section 4.8.3 and Section 4.8.5).
2. All materials are classified according to their decoupled lead time (DLT) (Section 
4.8.7).
3. Buffer positioning is executed, which means the components of the supply chain to 
be buffered are selected (Section 4.8.6).
4. The buffer size is calculated (Section 4.8.8).
Each of these steps might be repeated once in a while to adapt the setup to changes in 
the demand/supply conditions.
Let’s move on to execution. As a production planner, you can use the overview page as 
a starting point to detect deviations between actual and planned. The planning and exe-
cution steps are supported by their own SAP Fiori app; nevertheless, the DDMRP pro-
cess is embedded into the normal MRP of SAP S/4HANA, as pointed out in Section 4.3.
4.8.2    Buffer Profile Maintenance
A buffer profile defines how buffering is handled by DDMRP, for example, how buffer 
size and lead time are calculated. Figure 4.79 and Figure 4.80 show how mandatory con-
figuration data needed for DDMRP product classification in the subsequent steps is 
maintained. There are a set of buffer profiles available in the system that can be modi-
fied by the production planner with the Buffer Profile Maintenance app (Transaction 
PPH_DD_BUF_PROF).
You can define buffer profiles (see Figure 4.79) and assign them to your plants in the 
plant settings (see Figure 4.80). The Procurement Type used in Figure 4.79 is the default


<!-- Page 219 -->

4 Planning and Adjusting Inventory
220
source of supply calculated by MRP. You can see the assigned Variability Factor and DLT 
Factor for each attribute of Procurement Type, Variability Indicator, and DLT Indicator, 
which are used in product classification in Section 4.8.3.
Figure 4.79  Buffer Profile Maintenance Overview
Figure 4.80  Buffer Profile Maintenance Details
4.8.3    Product Classification: Mass Maintenance of Products
To start with DDMRP, you have to classify your materials so that the correct buffering 
strategy can be applied for each material. The Mass Maintenance of Products (DD) app
(F2825) allows you to perform mass maintenance of attributes related to DDMRP. Thus, 
you can manually carry out step 1 of the DDMRP setup discussed in Section 4.8.1. With 
this SAP Fiori app, you can classify your material master data in different categories, as 
shown in Table 4.1.
After starting the SAP Fiori app, you can use the filter criteria to create a list of materials. 
First, you mark the products within a simple list, as shown in Figure 4.81.
Category
Description
ABC classification
Classification according to goods issue value
PQR classification
Classification according to usage in BOMs
XYZ classification
Classification according to demand variability
EFG classification
Classification according to DLT
Table 4.1  Classification Categories


<!-- Page 220 -->

221
4.8 DDMRP
Figure 4.81  Mass Maintenance of Products Entry Screen
As a next step, click the Edit button (not shown), and in the subsequent modal window 
shown in Figure 4.82, you choose the attributes to be changed and enter their new value. 
The supported Lead Time calculation methods can also be changed in that view to con-
trol how the lead time is calculated in DDMRP.
Figure 4.82  Mass Maintenance of Products: Edit View


<!-- Page 221 -->

4 Planning and Adjusting Inventory
222
Note
Some changes are only accepted if the MRP Type is set to D1 (DDMRP).
4.8.4    Buffer Adjustment
We’ve seen that different algorithms can be used to calculate the lead time in Figure 
4.82, and we discussed the configuration in Chapter 3. One of the algorithms (PRED) is 
based on the SAP S/4HANA predictive analytics integrator mentioned in Chapter 1 (SAP 
HANA Predictive Analysis Library [PAL]).
As explained in Chapter 2, each machine learning model needs to be trained on an 
appropriate data set before being activated. Figure 4.83 shows the details of the predic-
tive model, including the model version history created by several trainings after enter-
ing the Predictive Models app. Only one model version can be active. With the Activate, 
Deactivate, Retrain, and Delete buttons, you can manage your model version. When 
training the model, you can add filter criteria to optimize the training data set.
Figure 4.83  Predictive Models: Predicted Individual Lead Time for Stock Transfer
Figure 4.84 shows the training results after clicking the arrow icon of a selected item in 
Figure 4.83. There is an overall indicator of the Quality and two KPIs indicating the per-
formance (Predictive Power) and the robustness (Predictive Confidence) of the trained 
model. The closer the values are to 1, the better. The Performance section contains the 
Key Influencers, that is, fields of the training view that contributed most to the model 
version’s performance.
If the predictive model is active, it can also be used to calculate the lead time in DDMRP 
(refer to Figure 4.82).


<!-- Page 222 -->

223
4.8 DDMRP
Figure 4.84  Training Results
 
Note
The DDMRP implementation in SAP S/4HANA Cloud Public Edition and its training and 
adjustment capabilities are robust enough for midsize companies. However, large 
enterprises with complex supply chains are recommended to leverage the DDMRP capa-
bilities of SAP Integrated Business Planning (SAP IBP) to constantly monitor and adjust 
DDRMP buffer sizes and positions (see Chapter 9).
4.8.5    Product Classification: Schedule Product Classification
The Schedule Product Classification SAP Fiori app supports you in classifying attributes 
of your material master data with a background job according to the categories 
described in Section 4.8.2. Thus, you can automatically carry out step 1 of the DDMRP 
setup (refer to Section 4.8.1). When entering the app, you’ll see a simple list of classifica-
tion job runs, with their Status and their Log as in Figure 4.85. When you click the arrow 
icon of a selected item, you navigate to the job’s details page (not shown).
When you click the Create button shown in Figure 4.85, you can create a new job (see 
Figure 4.86). The Product Selection Criteria allows you to define the set of products pro-
cessed by the job run.


<!-- Page 223 -->

4 Planning and Adjusting Inventory
224
Figure 4.85  Material Classification Job Maintenance
Figure 4.86  Entry Screen: Creating a New Material Classification Job (Part 1)
Figure 4.87 displays the fields (Thresholds for …) of the ABC, PQR, and XYZ classifications 
(refer to Table 4.1) to be used by the job run.
Figure 4.87  Entry Screen: Creating a New Material Classification Job (Part 2)


<!-- Page 224 -->

225
4.8 DDMRP
4.8.6    Buffer Positioning
After classifying your master data, you need to define the components whose material 
stock quantities are to be buffered during DDMRP (refer to Section 4.3). The Buffer Posi-
tioning app (F3282) helps you identify your components to be buffered so that you can 
carry out step 3 of the DDMRP setup discussed earlier in Section 4.8.1. The app leverages 
the BOM information stored in SAP S/4HANA (refer to Section 4.2). Downstream of the 
supply chain, you can identify all parents of one particular component up to the fin-
ished product. Upstream of the supply chain, you can identify all materials used to 
assemble your component. This information helps you to decide whether and how to 
buffer the component to protect its flow on the demand and supply side.
You can enter the SAP Fiori app as a simple list showing DDMRP-relevant data such as 
the following:
▪Lead Time
Lead time of the item (refer to Chapter 2).
▪Decoupled Lead Time
Lead time after buffer positioning (assuming that buffered materials are stocked).
▪Classifications
Material classification, according to Section 4.8.2.
You can directly execute actions, such as Simulate DLT, Buffer, or Unbuffer, on the list 
after selecting one or more items (see Figure 4.88).
Figure 4.88  Simple List: Buffer Positioning
You can access the details page for each entry by clicking the arrow icon of the selected 
item. Here, you see the upstream and downstream information (see Figure 4.89). You 
can switch between different display modes in the Upstream or Downstream drop-
downs:


<!-- Page 225 -->

4 Planning and Adjusting Inventory
226
▪BOM Usage
Counted usage in BOMs.
▪Longest Path
Longest path upstream in the supply chain.
▪Immediate Parent
Direct parents of the component.
You can also change the MRP Area of certain materials and thus change planning (refer 
to Chapter 3).
Figure 4.89  Details Tabular Display: Buffer Positioning
If you select the toggle button for graphical display on the right-hand side, you switch 
to an alternative view, that is, the network graph with the Graph Overview on the top-
right corner and the selected area in details below, as shown in Figure 4.90.
You can select one component shown in the network graph and perform a quick action 
on it, as shown in Figure 4.91. Quick actions include Buffer Analysis or Manage Buffer 
Levels (Section 4.8.9).


<!-- Page 226 -->

227
4.8 DDMRP
Figure 4.90  Details Network Graph: Buffer Positioning with Selected Material
Figure 4.91  Quick View with Action: Buffer Positioning
4.8.7    Schedule Lead Time Classification of Products
The Schedule Lead Time Classification of Products (DD) app (F2871) supports you in clas-
sifying the DLT of your material master data with a background job according to the EFG 
categories described in Section 4.8.3. Hence, you can carry out step 2 of the DDMRP 
setup discussed in Section 4.8.1.


<!-- Page 227 -->

4 Planning and Adjusting Inventory
228
If you open the Schedule Lead Time Classification of Products (DD) app, you’ll reach the 
Application Jobs scheduling screen, where you can select filter criteria to display a sim-
ple list of related jobs (see Figure 4.92). When you click the arrow icon of the selected 
item, you’ll reach the details screen of the job (not shown).
When you click the Create button as shown in Figure 4.92, you can create a new job (see 
Figure 4.93). The Product Selection Criteria section allows you to specify the set of mate-
rials to be classified by the job run.
Figure 4.92  Lead Time Classification Job Maintenance
Figure 4.93  Entry Screen: Creating a New Lead Time Classification Job (Part 1)
The fields in Figure 4.94 allow you to specify the DLT attributes in days to be used by the 
job run.


<!-- Page 228 -->

229
4.8 DDMRP
Figure 4.94  Entry Screen: Creating a New Lead Time Classification Job (Part 2)
4.8.8    Schedule Buffer Proposal Calculation
After finishing buffer positioning, it’s necessary to create a buffer proposal. The Sched-
ule Buffer Proposal Calculation app (F2837) supports you in generating buffer proposals 
based on the average daily usage (ADU), DLT, and buffer profiles of your materials. 
Hence, you can carry out step 4 of the DDMRP setup discussed earlier in Section 4.8.1. 
The proposals are the input of the Manage Buffer Levels app (Section 4.8.9).
If you open the Schedule Buffer Proposal Calculation app, you’ll reach the Application 
Jobs scheduling screen displaying a simple list of related jobs (see Figure 4.95). When 
you click the arrow icon of the selected item, you’ll reach the details screen of the job 
(not shown).
Figure 4.95  Buffer Proposal Calculation Job Maintenance
When you click the Create button in Figure 4.95, you can create a new job as shown in 
Figure 4.96 by selecting a Job Template, Job Name, and setting up your Scheduling 
Options.


<!-- Page 229 -->

4 Planning and Adjusting Inventory
230
Figure 4.96  Entry Screen: Creating a New Buffer Proposal Calculation Job (Part 1)
The Product Selection Criteria section allows you to specify the set of materials of which 
a buffer proposal will be calculated by the job run. The fields in Figure 4.97 allow you to 
specify the attributes to be used by the job run for the buffer proposal calculation.
Figure 4.97  Entry Screen: Creating a New Buffer Proposal Calculation Job (Part 2)


<!-- Page 230 -->

231
4.8 DDMRP
4.8.9    Manage Buffer Levels
The Manage Buffer Levels app (F2706) helps you to manually control the buffer level of 
your buffered components in DDMRP in changing demand/supply situations. Buffer 
proposals for safety stock level, reorder point level, and maximum stock level are calcu-
lated by the Schedule Buffer Proposal Calculation app (refer to Section 4.8.8). The opti-
mal buffer level balances excessive inventory costs with changing demand to ensure 
adequate stock availability.
When entering the Manage Buffer Levels app, you can filter for the desired materials in 
a simple list, as shown in Figure 4.98. You can see that micro charts visualize historic 
buffer levels, ADU, and future proposals.
Figure 4.98  Simple List: Manage Buffer Level
After navigating to the detail screen of one entry, you can directly perform actions on 
the buffer proposal such as Adopt, Discard, or Adjust. Adjusting allows you to change 
the buffer zone or the demand by an absolute or relative factor or by copying the values 
from a different material (see Figure 4.99).
Figure 4.99  Example Actions


<!-- Page 231 -->

4 Planning and Adjusting Inventory
232
For example, you could copy adjustments from the buffer of a certain product to 
another one by clicking the Apply button and, in the following screen (not shown), enter 
the product in the Product field under Copy Adjustments from Buffer.
For each list entry, you can navigate to a details screen by clicking the arrow icon of the 
selected items for closer investigation (see Figure 4.100). The details screen contains 
several sections:
▪Buffer Levels
Offers a graphical or tabular view of the history of buffer level changes. You can 
switch between the following views:
– Planning View: Shows you the buffer levels on a daily basis, as shown in Figure 
4.100.
– Execution View: Shows you the buffer level in comparison to the stock level on a 
daily basis, as shown in Figure 4.101.
– Comparison View: Allows you to compare actual settings with proposed buffer 
settings, as shown in Figure 4.102.
You can perform adjustments and simulate the changes of buffer levels when you’re 
in edit mode and click on Show Adjustments (see the table toolbar in Figure 4.100).
Figure 4.100  Simple List and Details Screen in Split Screen Mode: Manage Buffer Level 
All Sections


<!-- Page 232 -->

233
4.8 DDMRP
Figure 4.101  Buffer Levels: Execution View Visualizing Replenishment Operations
Figure 4.102  Buffer Levels: Comparison View Showing Current and Proposed Values
▪Average Daily Usage
Displays goods issue and PIRs plus the historic and the future ADU (see Figure 4.103). 
You can perform adjustments and simulate the changes when you’re in edit mode 
by clicking Show Adjustments (see the table toolbar in Figure 4.100).


<!-- Page 233 -->

4 Planning and Adjusting Inventory
234
Figure 4.103  Details Screen: Manage Buffer Level ADU
In addition to the ADU, you can see the network graph of the replenishment network 
(see Figure 4.104). For more details on the network graph, refer to Section 4.8.6.
▪Classifications
Contains the DDMRP-relevant material information.
Figure 4.104  Details Screen: Manage Buffer Level DLT


<!-- Page 234 -->

235
4.8 DDMRP
Figure 4.105 shows the simulation features when adjusting buffer levels, and Figure 
4.106 shows the simulation features when adjusting ADU. You just enter new time 
frames and values and then click Simulate Changes.
Figure 4.105  Manage Buffer Level Details Screen: Changing the Buffer Level in Private Cloud
Figure 4.106  Manage Buffer Level Details Screen: Changing the ADU in Private Cloud


<!-- Page 235 -->

4 Planning and Adjusting Inventory
236
4.8.10    Planners Overview
After finishing all configuration activities, we can now focus on monitoring our 
DDMRP. The Planners Overview app is an overview page (see Chapter 1, Section 1.4) sup-
porting the daily work of DDMRP planners, as shown in Figure 4.107.
Figure 4.107  Overview Page Supporting DDMRP
It contains the following cards:
▪Buffer Level Management
Shows you the total number of buffers with deviations (actual versus planned) on the 
top and the same data in a column chart according to the selected category. You can 
navigate to the Manage Buffer Level app (Section 4.8.9).
▪Replenishment Planning
Shows you the total number of buffers below the reorder point on the top and the 
same data in a column chart according to the selected category. You can navigate to 
the Demand-Driven Replenishment Planning app (Section 4.8.11).
▪Replenishment Execution
Shows you the total number of buffers below the safety stock on the top and the 
number of buffers with low on-hand stock in a column chart according to the 
selected category. You can navigate to the Demand-Driven Replenishment Execu-
tion app (Section 4.8.12).
4.8.11    Replenishment Planning
The Demand-Driven Replenishment Planning app supports you in monitoring buffer 
information sorted by planning priority. Based on this information, you can trigger 
appropriate actions to avoid out-of-stock situations.


<!-- Page 236 -->

237
4.8 DDMRP
Figure 4.108 shows the Demand-Driven Replenishment Planning app after selecting the 
desired data set and one immediate action to solve a shortage by creating supply.
Figure 4.108  Simple List: DDMRP
On the details page of the selected entry (click an arrow icon), you can see the Supply/
Demand List, Product Information, and Notes, as shown in Figure 4.109. You can switch 
the Supply/Demand List to display All MRP Elements or only the DDMRP-relevant ones.
Figure 4.109  Worklist: DDMRP with Selected Details Page
Quick views on single MRP elements support you in decision-making, and you can trig-
ger quick actions directly. For example, you can access the Create Order action shown


<!-- Page 237 -->

4 Planning and Adjusting Inventory
238
in Figure 4.109 to directly create a production order with the desired Receipt Quantity, 
Availability Date, and Source of Supply (see Figure 4.110).
Figure 4.110  Action: Creating an Order
To document your action, you can add notes. Figure 4.111 shows the lower part of the 
details page with Product Information and the Notes section.
Figure 4.111  Details Page: DDMRP Product Information and Notes


<!-- Page 238 -->

239
4.8 DDMRP
4.8.12    Replenishment Execution
The Demand-Driven Replenishment Execution app supports you in monitoring today’s 
stock situation for each product. Based on this information, you can trigger immediate 
actions to avoid out-of-stock situations and directly trigger the replenishment by con-
tacting the supplier of a purchase order or the production supervisor of a component 
production order.
Figure 4.112 shows the SAP Fiori app after selecting the desired data set with On-Hand 
Stock Status at risk, triggering one immediate action (Expedite Supply button) to solve 
a shortage by creating a planned order (see Figure 4.113). Moreover, another planned 
action has already been scheduled (not shown) and is indicated as Queued.
Figure 4.112  Simple List: DDMRP Execution (Part 1)
Figure 4.113  Simple List: DDMRP Execution (Part 2)
After you click the arrow icon of a selected item, you can see the Supply/Demand List, 
Product Information, and Notes on the details page (see Figure 4.114). You can switch the


<!-- Page 239 -->

4 Planning and Adjusting Inventory
240
Supply/Demand List to display All MRP Elements or only the DDMRP-relevant ones. 
Quick views on single MRP elements support you in decision making. For example, as 
shown on the right side of Figure 4.114, you can access the Stock action by clicking the 
MRP element Stock. Here, you can navigate to Display Stock Overview or configure 
additional navigation targets depending on your role (More Links).
To document your action, you can also add notes.
Figure 4.114  Worklist: DDMRP Execution
4.9    Kanban
If you plan with Kanban, this section will help you set up your planning strategy. Ini-
tially, we’ll get to know the Kanban control cycle and then we’ll discuss specific feature 
of Kanbans.
4.9.1    Manage Control Cycle
The Manage Control Cycle app (Transaction PKMC) enables creating, changing, and dis-
playing Kanban control cycles. You can enter the application after filling in the manda-
tory Plant field (“1710”, in our example) and clicking the Search button. Figure 4.115 
shows the selected Kanban control cycles. In our example, we have one event-driven 
and three classical Kanban control cycles.


<!-- Page 240 -->

241
4.9 Kanban
Figure 4.115  Manage Control Cycle (Search Button Not Shown)
If you select one control cycle in Figure 4.115, the details are shown. Figure 4.116 displays 
the details of the classical Kanban control cycle with replenishment by in-house pro-
duction.
Figure 4.116  Manage Control Cycle: Kanban with Replenishment by Production Order
It contains the following sections:
▪Control Cycle 7
Lists all related master data.
▪Lifecycle
Displays the lifecycle attributes.
▪Kanbans
Lists number, size, and distribution of Kanban containers.


<!-- Page 241 -->

4 Planning and Adjusting Inventory
242
If you scroll down, you’ll see the most important details of Kanban with replenishment 
by production orders in our example (see Figure 4.117). The In-House Production tab lists 
the production-relevant data, whereas the Flow Control tab defines when and how the 
replenishment is executed, including the summarized JIT call profile.
Figure 4.117  Kanban with Replenishment by Production Order Details Page
When you click the Display Kanban button, shown in Figure 4.116, all Kanban bins of the 
Kanban control cycle and their statuses are listed, as shown in Figure 4.118.
Figure 4.118  Display Kanban
Figure 4.119 shows the details of a Kanban control cycle with external replenishment by 
a scheduling agreement after selecting the first Kanban control cycle in Figure 4.115. The 
most relevant attributes, such as replenishment strategy (External Procurement), Sup-
plier, and Agreement are shown, which define how the Kanbans of this control cycle are 
replenished.


<!-- Page 242 -->

243
4.9 Kanban
Figure 4.119  Kanban with External Replenishment by Scheduling Agreement
4.9.2    Summarized JIT Call Scheduler
The Summarized JIT Call Scheduler app (Transactions PJ02, PJ03) allows you to define 
and schedule background jobs, which convert Kanban JIT calls on a regular basis into 
messages to suppliers, triggering the JIT replenishment.
Figure 4.120 shows the entry screen, which displays a simple job list. From here, you can 
navigate to the details screen in Figure 4.121 by clicking the arrow icon of a selected item 
or creating a new job by clicking the + icon.
Figure 4.120  Scheduling Summarized JIT Calls: Simple List of Scheduled Jobs with Statuses


<!-- Page 243 -->

4 Planning and Adjusting Inventory
244
Figure 4.121  Details Page of Selected Job Entry
The details page shown in Figure 4.121 displays the job’s details; most importantly, the 
Scheduling Options and the Run Details with the job log are provided.
When creating a new job, the job template defines the parameters you have to submit 
with the job. In the Scheduling Options section of Figure 4.122, you define when the job 
with which recurrence pattern will be scheduled by filling out the Start field or selecting 
the Start Immediately checkbox.
Figure 4.122  Creating a New Job: Scheduling Options


<!-- Page 244 -->

245
4.9 Kanban
In Parameter Section of Figure 4.123, you define parameters used to start the job:
▪Output Data
Defines the output generated by the job.
▪Processing Mode
Controls whether the job initiates, repeats, or corrects JIT calls.
▪Summarized JIT Call
Allows you to provide additional attributes, of which Plant is mandatory.
Figure 4.123  Creating a New Job: Parameter Section
4.9.3    Kanban Calculation
Setting up planning with Kanban entails an exact calculation of Kanban size and Kan-
ban numbers, which is beyond the scope of this book. Basically, the Kanban Calculation 
and Check Calculation Results apps (Transactions PK07, PK08N) allow you to calculate 
the number of Kanbans or the Kanban size per Kanban control cycle based on various 
methods and to view the calculated results and adjust them.


<!-- Page 245 -->

4 Planning and Adjusting Inventory
246
4.10    What’s Ahead for Inventory Planning and Adjustment?
Figure 4.124 outlines the idea of predictive MRP, which is a new tool currently developed 
as part of SAP S/4HANA. Predictive MRP enables end users to optimize midterm and 
long-term planning by simulating planning alternatives based on the operative data of 
the SAP S/4HANA production planning functionality. The operative data is converted 
and transferred to a new data structure optimized for planning simulation within pre-
dictive MRP. The converted data allows real-time simulation and analysis of what-if sce-
narios. Once optimized, the adjusted planning parameters can be released to the SAP
S/4HANA production planning functionality.
Figure 4.124  Predictive MRP Supporting Supply Chain Planning Optimization
Let’s take a closer look at new functionality for scheduling and processing predictive 
MRP simulations, starting with the prerequisites.
4.10.1    Prerequisites
Figure 4.125 delineates how the reference scenarios are created. Basically, you choose 
one anchor object (work center or material in Figure 4.125) and then extract the data to 
a simulation ID. The prerequisites to a successful extraction are as follows:
▪Materials created with applicable plant view
▪Materials part of a BOM (BOM Usage 1) with appropriate validity
▪Work centers with capacity information
SAP S/4HANA
Operative Data
Simplify
and Transfer
Simulate Planning
Parameter
Adaptations
Release
Adaptations 
SAP S/4HANA
Predictive MRP
SAP S/4HANA
Production Planning
Analyze Results
in Real Time


<!-- Page 246 -->

247
4.10 What’s Ahead for Inventory Planning and Adjustment?
▪Routings linking work centers and operations
▪Production version linking BOM and routings
▪PIRs
Figure 4.125  Two Possible Anchor Objects Used When Creating Reference Scenarios
Materials are only taken into account as anchor objects if they create the primary 
demand, which means they must be the root node of a BOM.
Let’s take a closer look at new functionality for scheduling and processing predictive 
MRP simulations.
4.10.2    Schedule Predictive MRP Simulation Creation
As explained previously, we need to extract the data for simulation first. The Schedule 
Predictive MRP Simulation Creation app allows you to define a reference plan, which is 
a prerequisite to creating predictive MRP simulations via job scheduling. A reference 
plan is basically a simplified extraction of operative data for material resource planning 
that is used downstream in the Process Predictive MRP Simulations app (which we’ll 
discuss in the next section). You can choose to create data based on work center data or 
top-level material data. In the Job Template field, select one of the corresponding tem-
plates:
▪Creation of pMRP Data via Top-Level Materials
Anchor object will be the material.
▪Creation of pMRP Data via Work Center
Anchor object will be the work center.
Work
Center
Operation
Routing
Production
Version
Bill of
Materials
Material
Capacity


<!-- Page 247 -->

4 Planning and Adjusting Inventory
248
Figure 4.126 shows the general part of the job template when scheduling a new job to 
create a predictive MRP simulation with the + icon. In this section of the job template, 
you define the Scheduling Options of the job, such as when and how often the job is exe-
cuted.
Figure 4.126  Scheduling a New Predictive MRP Simulation Creation: Scheduling Options
Figure 4.127 shows the predictive MRP job-specific Parameter Section:
▪ID for Reference Data
This mandatory field is the key of the reference scenario, whose simulation is created 
by this job.
▪Bucket Category
This field defines a monthly or weekly period pattern of the reference scenario’s data. 
All relevant demands are distributed over the specified bucket data and displayed in 
the simulation plan as defined in this app.
▪Start Date of Reference and End Date of Reference
These fields define the reference scenario’s time frame.
▪Simulation ID
This mandatory field will be used in the Process Predictive MRP Simulations app to 
identify the created simulation (see the next section).
▪Limitations
This section allows you to specify material-related master data that limits the data 
processed in the simulation. The criteria enable you to identify materials that are rel-
evant for simulation.


<!-- Page 248 -->

249
4.10 What’s Ahead for Inventory Planning and Adjustment?
▪Object Selection
This section in Figure 4.128 allows you to specify additional selection criteria to 
restrict the data processed in the simulation in case the anchor object is material. 
Figure 4.129 shows the layout if the work center is used as the anchor object.
Figure 4.127  Scheduling a New Predictive MRP Simulation Creation: Parameter Section
Figure 4.128  Scheduling a New Predictive MRP Simulation Creation: Parameter Section with 
Object Selection via Materials in SAP S/4HANA Cloud Private Edition


<!-- Page 249 -->

4 Planning and Adjusting Inventory
250
Figure 4.129  Scheduling a New Predictive MRP Simulation Creation: Parameter Section with 
Object Selection via Work Centers in Private Cloud
▪Stock Transfer Behavior
This section allows you to specify how stock transfers should be included in the sim-
ulation.
▪Document Data
This section allows you to specify how stock quantities will be calculated in the sim-
ulation. Opening Stock allows you to define whether to start your simulation without 
opening stock, with safety stock, with current plant stock, or with plant stock at the 
start of the reference scenario. In addition, you can select how PIRs and material dis-
continuation will be treated.
4.10.3    Process Predictive MRP Simulations
The current implementation of predictive MRP supports capacity planning with the 
Process Predictive MRP Simulations app (F3934). Figure 4.130 shows a list of all active 
simulations within predictive MRP after starting the SAP Fiori app. 
Figure 4.130  Simple List: Predictive MRP Active Simulations


<!-- Page 250 -->

251
4.10 What’s Ahead for Inventory Planning and Adjustment?
They are created by the jobs scheduled in the previous section or by copying existing 
simulations. After selecting one or more entries, you can Override Errors, Copy, Rename, 
or Delete simulations. If you feel a simulation’s settings are improving the production 
planning situation, you can Release the simulation to production planning so it 
becomes real. A released simulation can’t be altered further.
Each simulation can be worked on in the details screen by clicking the arrow icon of a 
selected item. Figure 4.131 shows a demand plan simulation of dedicated materials per 
time bucket. You can check the demands and immediately see the impact on Capacity 
Issues and Delivery Performance. You can switch between simulation views (Demand 
Plan/Capacity Plan/Issue List).
Figure 4.132 shows the impact of some changes after clicking Capacity Plan Simulation
of a work center per time bucket and adjustment of New Capacity Utilization.
Figure 4.131  Details Page: Adjustment Capacity Simulation
Figure 4.132  Details Page: Change Capacity Limit
If you click the Simulation Summary button, you get to the screen shown in Figure 4.133, 
which shows the Simulation Summary of all changes done within the selected simula-
tion plan compared to the reference plan. When working with several simulation plans,


<!-- Page 251 -->

4 Planning and Adjusting Inventory
252
you can compare the impact of capacity changes on meeting your planned deliveries 
and of Unresolved Issues.
Figure 4.133  Details Page: Simulation Summary
4.11    Summary
This chapter provided background about planning and adjusting inventory with the 
help of the production planning capabilities of SAP S/4HANA. It covered basic factors 
such as planning horizon, planning strategies (MTO, MTS, DDMRP, etc.), and planning 
tools. The second part of the chapter introduced the master data elements used during 
planning (BOMs, routing, master recipes, work centers, resources, etc.) and the SAP Fiori 
apps to access them. The third part of this chapter described the SAP Fiori apps to run, 
monitor, and adjust the planning process itself. The last section explored recent devel-
opments regarding predictive MRP.
In the next chapter, we’ll look at inbound delivery processes and how to handle them 
in SAP S/4HANA.
