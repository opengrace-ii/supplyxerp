# Chapter 3 Configuring Inventory Management


<!-- Page 80 -->

81
Chapter 3
Configuring Inventory Management
To run inventory management, you must first configure or customize it 
in your system. Inventory management is made up of many configurable 
pieces, ranging from organizational units to business processes to serv-
ers, roles, interfaces, and beyond, as you’ll see in this chapter.
Now that we’ve outlined the basics of SAP S/4HANA and inventory management, let’s 
move on to the required system configuration of inventory management to enable the 
related business processes. Not all configuration steps are unique to inventory manage-
ment due to SAP’s philosophy of providing an integrated system. We’ll also cover some 
hints for process automation to make life easier for end users.
This chapter gives step-by-step instructions for configuring inventory management in 
SAP S/4HANA through the IMG. Normally, you configure your organizational units first 
and then the processes linked to those units. You’ll also learn how to set up cross func-
tions, servers, and inbound and outbound interfaces, as well as the necessary steps to 
use prepackaged SAP Fiori roles.
 
Note
The implementation steps described in this chapter are applicable to SAP S/4HANA only. 
The SAP S/4HANA Cloud implementation methodology is significantly different and 
explained in Chapter 9, Section 9.2.2.
3.1    Implementation Guide Configuration
Configuration of an SAP system is mostly related to Customizing. A vital part of the con-
figuration is also the system landscape used in the project. Figure 3.1 shows a three-
system landscape that is used in many SAP projects. It’s also possible to work with a two-
system landscape in smaller implementation projects or to use a five-system or larger 
system landscape in large implementation projects. Most of the configuration is done 
in the Customizing system and then transferred to the quality assurance system. This 
transfer is often referred to as a transport. After successful integration testing in the 
quality assurance system, the entire project is then transferred to the productive sys-
tem, and the project is live. Technically, all configuration activities are collected in 
transport requests. This approach ensures the following:


<!-- Page 81 -->

3 Configuring Inventory Management
82
▪Traceability of all configuration changes moved from one system to another
▪Consistent implementation of configuration changes
▪Collecting configuration changes according to business semantics
▪Easy project and change management
▪Use of configuration templates provided by SAP, by partners, or internally
Figure 3.1  Typical Three-System Landscape
 
Note
Not all configuration steps can be transferred. Some have to be repeated in each system 
separately.
3.1.1    Implementation Guide Overview
The SAP S/4HANA IMG is a hierarchical structure comprised mainly of configuration 
tables’ maintenance views. You can access it by going to Transaction SPRO and clicking 
SAP Reference IMG. The hierarchy can be quite confusing at first glance because it’s not 
easy to understand the systematic approach it’s based on. Because many former indus-
try functions have been integrated in SAP S/4HANA, as mentioned in Chapter 1, the 
structure has become even larger in comparison to SAP ERP. Therefore, Figure 3.2 
sketches a heat map with the most important configuration activities related to inven-
tory management and to the technologies described in this book.
 
Note
You can use the search capabilities of the SAP menu to find nodes or configuration activities.
Let’s walk through a few of the key nodes:
▪ABAP Platform
Every technology-related configuration activity can be found below the ABAP Plat-
form node in Figure 3.2. Normally, this kind of configuration is owned by the system 
administrators, with one exception (as you’ll see in this section). Here you find the 
SAP Gateway configuration to set up the OData services used in SAP Fiori and exter-
nal interfaces. In particular, there are IMG activities to clear OData caches, which is 
very helpful if you deploy new service versions.
Customizing
System
Quality
Assurance System
Production
System
Transport of
Configuration
Transport of
Configuration


<!-- Page 82 -->

83
3.1 Implementation Guide Configuration
▪UI Technology
Below the UI Technology node, you find the configuration for SAPUI5, SAP Fiori, and 
SAP Jam Integration (see Chapter 1, Section 1.4, for more information on SAP Fiori).
▪General Settings
The General Settings node comprises the setup of units of measurements, curren-
cies, countries, and time zones.
 
Note
Inventory management may require adding additional units of measurements. Also, 
unlike fields showing an amount, in inventory management, fields showing a quantity 
are not rounded according to any rounding rules defined with the unit of measure. As a 
rule of thumb, decimals in a unit of measure definition are only considered if there's no 
loss of information. Otherwise, the technical definition of the output field defines the 
number of decimals. For example, 1.000 PC would be displayed as 1 PC, whereas 1.001 PC 
would be displayed as 1.001 PC. 
Figure 3.2  Inventory Heat Map of SAP S/4HANA IMG
IMG
ABAP
Platform
Enterprise
Structure
Cross-
Application
Components
Materials
Management
Production
Production
for Process
Industries
Logistics
Execution
SAPUI5
SAP Fiori
SAP Jam Integration
Logistics – General
Materials Management
Logistics – General
SAP HANA-Based Search …
Responsibility Management
Data Aging
Purchase Order
Set Up Stock Transport Order
Account Assignment
Decentralized WMS Integration
SAP Gateway
UI Technology
General Settings
Enterprise Search
Definition
Assignment
General Application Functions
General Settings for Materials …
Purchasing
Inventory Management and Ph..
Valuation and Account ….
Basic Data
Production Planning
Material Requirements Planning
Kanban
Master Data
Process Order
Logistics – General


<!-- Page 83 -->

3 Configuring Inventory Management
84
▪Enterprise Search
The Enterprise Search node is important for setting up the search function in the SAP 
Fiori Me Area (see Chapter 1, Section 1.4.3).
▪Enterprise Structure
The Enterprise Structure node contains all configuration activities to define the orga-
nizational structure of your SAP S/4HANA instance. It’s important to understand 
that the initial structure itself is configured with the activities below this node. This 
is described in detail in Section 3.1.2. The business-specific attributes of each organi-
zational unit are maintained where the business process is maintained, for instance, 
in inventory management (Section 3.1.3). To set up the initial organizational struc-
ture, you need to define the organizational units first (Definition) and then assign 
them to each other (Assignment). The organizational units are grouped into mod-
ules, and for inventory management, Logistics – General and Materials Management
are of interest.
▪Cross-Application Components
The Cross-Application Components node contains SAP HANA-Based Search and 
Responsibility Management (Section 3.3.2) configuration.
▪Materials Management, Production, and Production for Process Industry
The Materials Management node (with the Purchasing and Inventory Management 
and Physical Inventory subnodes), Production node, and Production for Process 
Industries node embrace most of the business configuration referred to in this book 
on inventory management in SAP S/4HANA. We’ll cover Purchasing in Section 3.1.4 
when focusing on stock transport orders. Inventory Management and Physical 
Inventory is covered in Section 3.1.3, and Production and Production for Process 
Industries will be covered in Section 3.1.6.
The IMG-based configuration of SAP S/4HANA systems isn’t an easy task, which is why 
SAP and SAP partners offer preconfigured system configurations containing various 
best practices. Depending on the SAP S/4HANA system setup, the best practice config-
uration is in client 000 or is created using SAP for Me. The latter is the cornerstone of 
SAP S/4HANA Cloud configuration, which we’ll explore in Chapter 9, Section 9.2.
3.1.2    Organizational Units
Organizational units structure your enterprise organization in a logical way and sup-
port you in your business projects. Sometimes there is a direct mapping of physical 
units to logical units, but this isn’t always the case. For example, a plant modeled in SAP 
S/4HANA can’t always be related to a physical building. Sometimes it’s a logical unit 
required to organize the material flow within a company. We’ll focus on inventory man-
agement when discussing the organizational structure, in which the following aspects 
need to be considered:


<!-- Page 84 -->

85
3.1 Implementation Guide Configuration
▪A basic configuration step should reflect the enterprise structure in the IMG config-
uration as a basis to show the stock situation on different organizational levels.
▪Valuation of the stock is an important aspect to consider when setting up the enter-
prise structure.
▪Processes have a strong impact when defining an organizational structure. For 
example, if you plan to use the 3GL logistics provider, you’ll need to set up storage 
locations that serve as proxy objects (Section 3.1.5).
▪Security and compliance may also play a role.
The main organizational units in inventory management are the storage location
(where inventory is stored as a rule) and the plant (where inventory is manufactured as 
a rule). The company code serves as the scaffold for one or more plants and links the 
plant with its logistic processes indirectly to financial processes. In material require-
ments planning (MRP), the MRP area also plays an important role (as we’ll discuss in Sec-
tion 3.1.6), but it isn’t part of the original enterprise structure.
Figure 3.3 outlines the aforementioned organizational units and presents an example 
setup on the right-hand side. Note that you can do material valuation on the plant level 
or the company code level, depending on your configuration. In general, inventory 
stock quantities are defined on a more granular level in the logistics processes than in 
the financial processes. This can sometimes lead to confusion between end users with 
a logistics view and end users with a controlling view. Some analytical applications in 
inventory management break down inventory value according to the rule of three if 
there is no one-to-one mapping between the material quantity kept in inventory man-
agement and the material value kept in the material ledger. This closely resembles the 
controlling view of inventory values, but it may result in rounding differences. Alterna-
tively, the inventory value is always calculated based on the actual price multiplied with 
the material quantity, which resembles the planner view of inventory values.
Figure 3.3  Organizational Units in Inventory Management
Company
Code
Plant
Storage
Location
1000
1010
1011
1020
1011
1021
• Material valuation
• Link to financial
   accounting
• Material valuation
• Inventory
• MRP
• Material master data
• Inventory
• MRP
• Material master data
Organizational
Structure Schema
Organizational Structure
Implementation


<!-- Page 85 -->

3 Configuring Inventory Management
86
 
Note
A plant key is unique within one SAP S/4HANA client, whereas a storage location key can 
be assigned to more than one plant but is considered a different entity (as with storage 
location 1011 in Figure 3.3).
As mentioned in Chapter 2, Section 2.1, there are several stock types and special stock 
types used in SAP S/4HANA to define inventory. Some are defined on the storage loca-
tion level, and some are only available on the plant level of the organizational hierarchy.
An organizational structure is reflected in master data as well, most notably in the 
material master data. A prerequisite to creating stock of a certain material in a storage 
location is that the material must be created for this storage location (i.e., the storage 
location view of the material must exist). The same rule applies to plants.
As shown previously in the IMG inventory heat map in Figure 3.2, you need to define 
your organizational units first and then assign them (i.e., build the hierarchy in Figure 
3.3). Figure 3.4 shows the relevant part of the IMG with the focus on the plant definition.
Figure 3.4  Plant Definition in the IMG
You can define the plant and storage location, as follows:
▪Plant
A plant is the organizational and operational unit in which the company’s stock is 
managed and reported. To define the plant, go to Enterprise Structure • Definition •


<!-- Page 86 -->

87
3.1 Implementation Guide Configuration
Logistics – General, and select Define Plant, arriving at the screen shown in Figure 3.4. 
Each plant belongs to one company code and country. This company code depen-
dency becomes important for logistic processes and material movements between 
different companies and countries because different currencies and valuation capa-
bilities come into account. Figure 3.5 shows the details of a plant. Besides the address 
attributes, which can be edited by the address menu function (not shown), the Fac-
tory Calendar is important in logistics processes.
Figure 3.5  Details of a Plant
 
Note
The plant’s address is mandatory for certain logistics processes. In particular, the time 
zone is used in some applications (capacity planning, available-to-promise [ATP], etc.) 
when calculating timestamps related to a plant.
▪Storage location
A storage location is on the lowest organizational level in inventory management and 
is defined by going to Enterprise Structure • Definition • Materials Management and 
selecting Maintain storage location, as shown earlier in Figure 3.4. Figure 3.6 shows 
the storage location detail screen. You can edit the address by selecting the corre-
sponding node on the right-hand side.


<!-- Page 87 -->

3 Configuring Inventory Management
88
Figure 3.6  Storage Locations per Plant 0001
 
Note
The storage location organizational entity supports a soft removal feature as it offers a 
Validity indicator, which can be valid, deprecated, or no longer valid. When planning the 
removal of a storage location entry, you can use deprecated and no longer valid to initi-
ate a soft removal. The deprecated state will still allow you to work with this entry in 
inventory management, but block any material document postings that do not bring 
the inventory stock in the deprecated storage location closer to 0. The no longer valid 
setting will block any material document posting.
A standalone storage location can’t exist, so it’s always created in the context of a plant
(see Figure 3.7). Below the storage location level, there are bins, which are used in ware-
house management. In Chapter 5, Section 5.7.1, we will learn how a simple setup with 
bins can be achieved without the need to activate warehouse management.
Figure 3.7  Organizational Units in Inventory Management
Plant (1000)
Storage Location
(0001)
Storage Location
(0002)
Storage Location (…)
Plant (…)
Storage Location
(0001)
Storage Location
(0002)
Storage Location (…)
Company Code
(1000)
Company Code
(…)


<!-- Page 88 -->

89
3.1 Implementation Guide Configuration
As shown earlier in the IMG inventory heat map in Figure 3.2, the next step is to assign 
your plant to the company code using the Assign plant to company code activity found 
in the IMG menu path under Enterprise Structure • Assignment • Logistics – General, as 
shown in Figure 3.8.
Figure 3.8  Assigning a Plant to a Company Code in the IMG
Besides the basic organizational units in inventory management, there are some addi-
tional organizational units that might be touched in inventory management:
▪Purchasing organization
The purchasing organization belongs to procurement and is crucial to structure the 
procurement process. A purchasing organization is in charge of procurement of 
related goods from vendors and is referred to in stock transport orders (order type 
UB) or in standard purchase orders (order type NB), for instance.
To define the purchasing organization, go to Enterprise Structure • Definition • Mate-
rials Management • Maintain Purchasing Organization.
▪MRP area
The MRP area is an element used to structure production planning for materials. By 
linking a material to MRP areas, you can control when and how a material is planned 
(Section 3.1.6).
3.1.3    Inventory Management
Configuring inventory management essentially means configuring the processes 
linked to material document postings. The related settings for inventory management 
are clustered below IMG node Materials Management • Inventory Management and 
Physical Inventory. To open the IMG, run Transaction SPRO.


<!-- Page 89 -->

3 Configuring Inventory Management
90
Figure 3.9 displays the IMG section covering inventory management. There are five 
main configuration clusters:
▪Set up number range intervals for documents
▪Configure processes per plant
▪Configure processes per movement type
▪Set up physical inventory process
▪Configure transactions, reporting, printing, output management, authorization, and 
stock determination
We’ll walk through each in the following sections. But first, we’ll cover two activities that 
need to be set up before the main inventory management configuration steps: late 
locking and system messages.
Figure 3.9  Inventory Management and Physical Inventory in the IMG
Late Locking
Let’s start with an important setting for material document processing regarding the 
database locking mechanism. With SAP S/4HANA, a new feature was implemented to 
make use of an optimized database locking feature called late lock. Late locking can be 
activated with IMG activity Set Material Lock for Goods Movements, which can be 
accessed via the menu path Materials Management • General Settings for Materials


<!-- Page 90 -->

91
3.1 Implementation Guide Configuration
Management. As shown in Figure 3.10, in the Material lock field, select 2 Late lock, and 
a Waiting time in case of lock collisions (the system will retry to get the lock after a cer-
tain time). This will minimize the time a material master record is locked during stock 
changes but may lead to late failures/long waiting time in case of lock collisions. Alter-
natively, you can select Exclusive Lock to avoid any lock collisions upfront by increasing 
the timeframe during which a material master records locked during stock changes.
Figure 3.10  IMG Activity for Activating Late Locking
By activating this setting, performance benefits are available, especially regarding high 
volume-based transactions that perform a large amount of material document post-
ings.
 
Further Resources
More detailed information and possible side effects of this setting are described in SAP 
Notes 2267835 and 2338387.
Define Attributes of System Messages
It’s not uncommon in SAP S/4HANA to configure the severity of system messages. In 
general, a message with a severity error will block a certain process. If the severity is low-
ered to warning, the information or message doesn’t suppress the process, and it runs 
through. Thus, by configuring the severity of a dedicated message, you can configure a 
process in inventory management. You can activate the changes for all end users or just 
for a subset.
To define system message attributes, go to IMG menu path Materials Management • 
Inventory Management and Physical Inventory • Define Attributes of System Messages. 
Inventory management messages are identified by the message class M7 (see also SAP 
Note 2715486). Messages from invoice verification use messages class M8. If, for exam-
ple, you alter the system messages’ M8 081 and M8 194 severity from error to warning, 
you’ll be able to perform goods receipt-based invoice verification even if the invoice 
quantity differs from the goods receipt quantity.


<!-- Page 91 -->

3 Configuring Inventory Management
92
Number Range Intervals
Before taking a deeper look into the predelivered movement types and how to adjust or 
copy them, let’s first discuss the number range object for material movements and 
physical inventory documents. Each posting of a material movement or physical inven-
tory document creates a new document in the system. Without an assigned number 
range object, the document can’t be created at all. The number of this document is taken 
from a number range object that is defined in the IMG menu path, Materials Manage-
ment • Inventory Management and Physical Inventory • Number Assignment (see Figure 
3.11). For the different categories of documents, different number range intervals are 
defined.
Figure 3.11  Number Range Object for Material and Physical Inventory Documents in the IMG
After you start the Define Number Assignment for Material and Physical Inventory Doc-
uments IMG activity (see Figure 3.11), you have to click the pencil icon (Intervals) (or just 
Display, not shown) to display the screen shown in Figure 3.12. The four intervals are 
hardwired to physical inventory documents, material documents except goods receipts, 
material documents representing goods receipts, and inventory sampling numbers.
Figure 3.12  Different Intervals of Number Range Object MATBELEG
The Number Assignment IMG activity also provides a feature to set the status of the 
number range manually to a certain number. Be careful, though, because adapting the 
number range status manually might lead to number collisions, which would lead to a 
short dump during material document or physical inventory document posting.


<!-- Page 92 -->

93
3.1 Implementation Guide Configuration
Resetting the number range intervals may be required under following conditions:
▪The interval is approaching its upper limit. As the key of material or physical inven-
tory document is composed of the fiscal plus the document number, you can reset 
the intervals to their lowest limit at the beginning of a new fiscal.
▪You successfully performed an archiving run for the current fiscal year (see also 
Chapter 1) and now want to leverage the freed-up document numbers by resetting 
the interval to the first number of the archived document.
Plant Parameters
Many processes in inventory management are controlled on the organizational unit 
level (plant) and on the transactional level (movement type). Figure 3.13 shows the con-
figuration of a plant with IMG activity Plant Parameters in the menu path Materials 
Management • Inventory Management and Physical Inventory • Plant Parameters.
Figure 3.13  Configuration of a Selected Plant


<!-- Page 93 -->

3 Configuring Inventory Management
94
You can control actions encompassing material document postings, set up the basic 
parameters of the physical inventory counting process, and define which negative 
stocks are allowed on the plant level.
There are four key sections to configure in Plant Parameters:
▪Goods Movements
These plant parameters control processes during goods movement. Often you 
enable a process first on the organizational level and second on the transactional 
level (see the next section).
▪Physical Inventory
This section controls parameters of the physical inventory process (see Chapter 6, 
Section 6.6).
▪Reservations
This section controls parameters when using reservations (see Chapter 7, Section 7.1).
▪Negative Stocks
By default, SAP S/4HANA doesn’t allow you to create negative stock quantities. Neg-
ative stock quantities typically hinder period-end closing activities. If a material doc-
ument posting would create a negative stock quantity, the posting is rejected.
 
Note
Allowing negative stocks transiently eases sequencing issues during high-volume mate-
rial document postings of goods issue and goods receipts. You need to allow the nega-
tive stocks also on the storage location level with Goods Issue/Transfer Posting • Allow 
Negative Stocks IMG activity and in the material master for each material.
Movement Types
The cornerstone of each material movement and related material document in inven-
tory management is the movement type concept. A rough glimpse into the importance 
of movement types was given in Chapter 1.
A movement type is defined by a three-digit number plus related control indicators. 
Figure 3.14 sketches the following four aspects that a movement type influences during 
a material document posting:
▪The movement type controls which attributes of the material document posting are 
populated. Most important, the movement type controls all stock-identifying fields 
and hence the material stock quantity.
▪Depending on the business process, the movement type requires a predecessor doc-
ument, such as a purchase order or delivery. The predecessor document gets updated 
during the material document posting.


<!-- Page 94 -->

95
3.1 Implementation Guide Configuration
▪Depending on the business process, the movement type initiates the automatic cre-
ation of a successor document, such as an accounting document.
▪Depending on the business process, the movement type creates some auxiliary 
objects, for example, a material batch, serial numbers, or the storage location view of 
a material.
In addition to the impact on persistency of other transactional objects, certain process 
control attributes are linked to movement types, too. Examples are the categorization 
as consumption posting or the ATP relevance. During material document posting, the 
process control attributes are evaluated and influence the posting’s result (including a 
posting abort).
Figure 3.14  Movement Type: Functional Perspective
The second point of the preceding list, regarding predecessor documents, may espe-
cially lead to the material document posting itself only being triggered due to the suc-
cessor document posting. One example is the posting of physical inventory differences.
The material documents in SAP S/4HANA can’t be altered after posting, which means a 
material document is reversed by creating a material document posting inverting the 
original material document. This is called a material document reversal (posting). For 
each movement type, there is an assigned reversal movement type and vice versa. 
Based on this assignment, the system automatically determines the movement type 
during a reversal. Consequently, this mechanism implies you can only completely 
reverse a material document item; partial reversal of the item isn’t possible unless you 
use a workaround (which is beyond the scope of this book).
Movement Type
Create
Material
Document
Entry
Update
Predecessor
Document
Create
Successor
Document
Create
Auxiliary
Objects


<!-- Page 95 -->

3 Configuring Inventory Management
96
Note
As a rule of thumb, the “normal” movement type has an odd number, and the reversal 
movement type has the following even number.
Movement type numbers are clustered according to the business process they are used 
in. Table 3.1 shows the cluster based on the first digit.
Figure 3.15 shows the configuration of a movement type with the Copy, Change Move-
ment Types IMG activity, which you can access via menu path Materials Management •
Inventory Management and Physical Inventory • Movement Types. This IMG activity 
allows you to change any attribute of a movement type. We’ll explore process-specific 
changes of movement types with simpler IMG activities.
Let’s walk through configuring the main sections for this screen, as follows:
▪Dialog Structure
The left-hand dialog contains additional attributes, texts, field controls, and succes-
sor documents. Click the node in the hierarchy if you want to change any of the listed 
movement type attributes.
▪Entry Control
This section contains the attributes before posting. Here you can set defaults or
checks to control processes on the transactional level.
▪Updating Control
This section contains the actions during posting. Here you can also control processes 
on the transactional level.
Creation of custom additional movement types to the customer namespace should be 
done by copying an existing configuration of a selected movement type to ensure con-
sistency of all dependent parameters. New movement types are typically created to 
Table 3.1  Movement Types in SAP S/4HANA 
Movement Type
Business Process
Goods issue linked to different accounting objects
7XX
Physical inventory difference postings
Goods issue linked to shipping
Goods receipt/initial stock entry without predecessor document/
scrapping/adjustments during subcontracting
Material transfer postings
3XX – 4XX
5XX
6XX
2XX
1XX
Goods receipt linked to predecessor document postings


<!-- Page 96 -->

97
3.1 Implementation Guide Configuration
determine different accounts in financial accounting or authorization-related con-
trolling, for instance.
Figure 3.15  Configuration of a Selected Movement Type
Note
When analyzing the transport request containing a copied movement type, you’ll 
notice a lot of technical settings being copied over, which are not visible to customers 
and are SAP owned. These settings contain technical attributes that are evaluated 
during the material document posting control flow. Moreover, each copy retains links 
to each original.
As pointed out at the beginning of this section, process control in inventory manage-
ment is most often done on the plant (i.e., organizational) level and on the movement 
type (i.e., transactional) level. That is why the SAP S/4HANA IMG offers special activities 
for each dedicated process summarizing both configuration activities and offers only a 
suitable set of movement types. Figure 3.16 shows as example the Goods Receipt pro-
cess containing the following plant/movement type settings:


<!-- Page 97 -->

3 Configuring Inventory Management
98
▪Create Storage Location Automatically
If activated, the storage location view of the material master record is created auto-
matically, if missing.
▪Create Purchase Order Automatically
If activated, a purchase order is created automatically based on defaults, if missing 
during the goods receipt.
▪Set Manual Account Assignment
If activated, a manual account assignment is supported.
▪Set “Delivery Completed” Indicator
Allows you to configure when and how the goods receipt process is completed in 
inventory management.
▪Allow Reversal of GR Despite Invoice
Allows you to configure how reversals of material documents are handled in the 
goods receipt process.
▪Set Expiration Date Check
Allows you to configure how the shelf-life process is handled (we’ll discuss shelf life 
later in this section).
Figure 3.16  Goods Receipt Process Configuration
The identical settings exist for goods issue/transfer postings and automatic move-
ments. They generally appear as a simple checkbox or dropdown list, as demonstrated 
for storage location creation in Figure 3.17.
 
Note
If you want to configure a specific process, it might be easier to look for the specialized 
IMG activity, instead of using the general ones described previously.


<!-- Page 98 -->

99
3.1 Implementation Guide Configuration
Figure 3.17  Change Storage Location Automatically
Physical Inventory Process
In Figure 3.18, all relevant IMG activities with a focus on physical inventory are collected 
(accessed via menu path Materials Management • Inventory Management and Physical 
Inventory • Physical Inventory).
Figure 3.18  Physical Inventory IMG Activities Overview


<!-- Page 99 -->

3 Configuring Inventory Management
100
The following list describes the most important activities in more detail:
▪Field Selection for Physical Inventory
The Field Control screen can be maintained (i.e., add a mandatory field, such as rea-
son code) during physical inventory if the physical inventory document must con-
tain the reason code for differences.
▪Default Values for Physical Inventory
Plant-dependent values can be reset for physical inventory documents, such as stock 
type or reason code, as shown in Figure 3.19. Enter your required default values, that 
is, the Reason f. difference.
Figure 3.19  Defaults for Physical Inventory Documents
▪Settings for Physical Inventory
The following settings are available at the plant level:
– Activate change documents for logging of changes made to physical inventory 
documents.
– Activate the adjustment of the book inventory balance.
– Activate the serial number display and printing on the physical inventory docu-
ment.
▪Default Values for Batch Input
The batch input technology (technology for automatic recording and replay of user 
input on SAP GUI screens, which is used for dark background processing) for process-
ing physical inventory documents can be controlled related to the given reports 
when accessing the IMG activity. Figure 3.20 outlines the possible settings for the 
batch input creation of physical inventory documents during the cycle counting pro-
cess:
– Batch Input Data
Define the batch input-related data. For instance, you can enter the maximum 
number of items a physical inventory document should contain.
– Physical Inventory Data
Give the presettings for the physical inventory process itself. For instance, you


<!-- Page 100 -->

101
3.1 Implementation Guide Configuration
might block the stock that is part of the physical inventory by setting the Phys. Inv. 
Block indicator.
– Stock Types
Indicate the affected stock types.
– Control
Use this indicator (not shown) to enable that in certain cases (e.g., errors), the pro-
cessing is switched back to direct processing rather than batch processing.
Figure 3.20  Defaults of Batch Input Processing
▪Maintain Copy Rules for Reference Documents
When inventory differences are processed (see Chapter 6, Section 6.6), the system 
can automatically set the provided physical inventory document items to prese-
lected for further processing and posting of differences if activated (not shown).
▪Allow Freezing of Book Inventory Balance in Storage Location
One flag is provided per plant and storage location to allow the freezing of the book 
inventory balance per storage location (not shown). As a result, the frozen inventory 
balance is recorded in the physical inventory document accordingly for further


<!-- Page 101 -->

3 Configuring Inventory Management
102
calculation of inventory differences after the count result is entered. Material move-
ments such as additional goods receipts, which might happen during counting, 
won’t harm the calculation of the inventory differences afterwards because the ini-
tial inventory balance is still present on the physical inventory document level.
▪Define Tolerances for Physical Inventory Differences
The value ranges of the amount of inventory differences that the end user is allowed 
to post are defined by first creating physical inventory tolerance groups (Phys.inv. 
tolerance group) with related values ranges and assigning these groups to the related 
users afterwards, as shown in Figure 3.21. Note that user-related settings need to be 
repeated on each client.
Figure 3.21  Physical Inventory Tolerance Group
In the example in Figure 3.21, the user group 0001 is allowed to post inventory differ-
ences up to 100.000,00 euros for all items and up to 10.000,00 euros for a single 
item.
▪Cycle Counting
The cycle counting indicators are used to group the relevant materials that should be 
taken into account for the cycle counting process. The definition is done per plant 
and assignment of individual cycle counting indicators (e.g., A, B, C, D) in the example 
shown in Figure 3.22, which is usually based on an ABC analysis (categorization of 
materials according to their business relevancy). The key columns for each plant are 
as follows:
– C...
In combination with the plant, a unique ID for the cycle counting indicator.
– No.of phys.invtories
Number of physical inventories per fiscal year.
– Phys. inv. inter... 
Definition of counting intervals.
– Float time
Number of working days that the current count date might differ from the 
planned count date.


<!-- Page 102 -->

103
3.1 Implementation Guide Configuration
– Percentage
Ratio of materials counted within this indicator. Sum of all cycle count indicators 
per plant has to be 100%.
Figure 3.22  Definition of Cycle Counting Indicators
This indicator is assigned in the material master record of a material manually via 
the related material master applications (see Figure 3.23) via the SAP Fiori app, Cycle 
Counting Classification (F4486), or automatically via report RMCBIN00 (ABC Cycle 
Counting Analysis). If you assign cycle counting indicatory A (defined in Figure 3.22) 
to the material, the material would be subjected to 12 cycle counts per year (repre-
senting 10% of all cycle counted materials in this plant) and allowing five working 
days deviation between count date and planned count date.
Figure 3.23  Material Master Record Cycle Counting Indicator
General Configuration Settings
This section introduces some rather generic, but important, settings for inventory 
management in SAP S/4HANA:
▪Allow Negative Stocks
In this IMG activity, underneath Goods Issue/Transfer Postings, negative stock for 
unrestricted use stock can be enabled on different levels (e.g., plant; see Figure 3.24).


<!-- Page 103 -->

3 Configuring Inventory Management
104
In addition, the negative stock can be allowed for individual special stocks (Sales 
order stock, in our example). The standard setting is that negative stocks aren’t 
allowed.
Figure 3.24  Allowing Negative Stocks per Plant and Special Stock
This setting might be required if goods issues are posted before the related receipt of 
the materials was posted, which helps keep the inventory balanced when the goods 
receipts are entered in a later stage.
▪Set Expiration Date Check
In Chapter 5, we’ll introduce native SAP Fiori apps for goods receipt processing. These 
SAP Fiori apps can take into account the settings of the Set Expiration Date Check
IMG activity. Here, the expiration date check can be configured on the plant and/or 
on the movement type level, as shown in Figure 3.25, and can be set to the following:
– No check
– Enter and check
– Enter only
– No check at goods issue
Figure 3.25  Expiration Date Check for Movement Type
If the total shelf life is defined in the material master record, the shelf-life expiration 
date is calculated based on the entered production date.


<!-- Page 104 -->

105
3.1 Implementation Guide Configuration
▪Authorization Check for Storage Locations
Located under Authorization Management, the authorization check level in inven-
tory management can be detailed to the storage location level for individual storage 
locations. The standard authorization check is on the plant level, but business needs 
might require an authorization check on the storage location level; for example, if
materials with high values are handled within a certain storage location, only specific 
end users will be allowed to post material movements for this kind of material.
▪Stock Determination
The Stock Determination node allows you to configure stock determination strate-
gies based on product master settings (Stock determination group) and application
settings (Stock determination rule). The specific combination of stock determination 
group and stock determination rule define the stock determination strategy per
plant and automatically execute a stock determination based on quantity, price, and 
valuation type. Figure 3.26 shows the definition of a stock determination group with 
its header settings (i.e., which attribute and which priority are used to sort the stock).
Figure 3.26  Stock Determination Group 0001 in Plant 001 with Settings on Header Table
If stock type, storage location, or valuation type will be used during stock determina-
tion, the item table must be configured, as shown in Figure 3.27.
Finally, to activate the stock determination rule in inventory management, you have 
to assign the stock rule (Stck Determination Rule) field to a movement type (MvT), as 
shown in Figure 3.28.


<!-- Page 105 -->

3 Configuring Inventory Management
106
Figure 3.27  Stock Determination Group 0001 with Settings on Item Table
Figure 3.28  Assignment of Stock Determination Group to Inventory Management 
(Represented by Movement Type)
▪Define Consumption Groups
Many analytical processes in inventory management require the calculation of
inventory consumption. By default, inventory consumption is recorded in material
document postings strictly linked to certain movement types. However, inventory
analytics often require inventory consumption to be calculated in the context of the 
business process to be analyzed. Thus, you can use a consumption group to flexibly
define the material document postings to be considered as consumption in a certain 
business context.
If you would like to override the default settings, you can create your own inventory
consumption groups. Figure 3.29 displays an inventory consumption group designed 
to define cross-plant material document postings (movement type 301 and 303) as
stock consumption.
Figure 3.29  Inventory Consumption Group with Movement Types


<!-- Page 106 -->

107
3.1 Implementation Guide Configuration
 
Further Resources
For the exact details regarding movement types, refer to SAP Note 1832196.
Consumption groups can be specifically designed with this IMG activity to enable more 
detailed analysis of consumption postings according to end users’ needs. Default con-
sumption group 000 is predelivered and contains no movement types, which means 
that the Consumption posting indicator shown earlier in Figure 3.15 for each movement 
type is still used (default setting).
After you’ve defined your own consumption group by adding the movement types 
describing inventory consumption in your desired analytical query, the material docu-
ment quantities linked to these movement types are used to calculate inventory con-
sumption, if you select your new consumption group while running the analytical 
query.
 
Note
The settings made in this IMG activity are used in the Slow or Nonmoving Items app 
(F2137), Cycle Counting Classification app (F4486), and the Inventory KPI Analysis app 
(F3749).
3.1.4    Procurement
Now let’s continue with the setup for procurement processes that directly impact 
inventory management processes. First, we’ll cover the account assignment category 
controlling the goods receipt process, and then we’ll discuss how to set up the stock 
transfer process.
The IMG activities linked to procurement are located mainly under the Materials 
Management node. In this section, we’ll walk through key procurement processes and 
their associated activities, focusing only on those that directly impact inventory man-
agement.
Document Flow
Figure 3.30 shows the document flow at the start of a procurement process. The pur-
chase requisition document containing the header and items collects the internal 
requirements. It’s addressed to the purchasing organization and then approved and 
converted into a purchase order with header and items, which represents a formal 
request to procure goods from an external or internal supplier.


<!-- Page 107 -->

3 Configuring Inventory Management
108
Figure 3.30  Document Flow in Procurement
There are some variants to how the procurement process continues, but from an inven-
tory perspective, the purchase order or the purchase order-based inbound delivery are 
the anchor documents to create the goods receipt document when the goods arrive at 
the receiving plant. The goods receipt updates the purchase order history, eventually 
closes the process by setting the Delivery Completed indicator per purchase order item, 
and initiates invoice verification. The process may also vary depending on the type of 
procurement process, for example, standard, subcontracting, consignment, stock 
transfer (which we’ll discuss later in Section 3.1.7), or external service.
Account Assignment Category
One prominent attribute to be controlled in procurement is the account assignment cat-
egory of the purchase order item. Figure 3.31 shows that the account assignment category 
influences the procurement process, but it also affects the account determination (costs 
are apportioned among various controlling objects) and—most of all—the goods receipt 
process. 
Figure 3.31  Account Assignment Categories: Influencing Different Factors
Purchase
Requisition
Purchase
Order
Collection of Internal
Requirements
Formal Request from
Purchasing Organization to
Supplier or Plant to Provide a
Defined Quantity of Goods at
a Given Point in Time
Purchasing Organization
Conversion
Account Assignment
Category
Account
Determination
Procurement
Process
Special
Stock
Type
Inventory
Stock
Goods Receipt
Process


<!-- Page 108 -->

109
3.1 Implementation Guide Configuration
For instance, the special stock type created during a goods receipt is derived from the 
account assignment category settings of the purchase order item (with one exception: 
vendor consignment stock is directly derived from the item category K).
The account assignment category of the purchase order item also determines whether 
inventory stock is created by the goods receipt or whether it’s a consumption posting, 
where a goods receipt is directly consumed and internally billed according to the 
account assignment category.
Figure 3.32 displays the Account Assignment IMG node and its activities, which you can 
access via the menu path, Materials Management • Purchasing • Account Assignment, 
as follows:
▪Maintain Account Assignment Categories
Create/edit account assignment categories.
▪Define Combination of Item Categories/Account Assignment Categories
Create the valid combination of the mentioned field in the purchase order item.
Figure 3.32  Account Assignment Node
Figure 3.33 presents the Maintain Account Assignment Categories detail screen. The 
Detailed information area is important for configuring the factors mentioned earlier in 
Figure 3.31:
▪Goods receipt
The goods receipt-related indicators control how the goods receipt and subsequent 
invoice verification is to be executed.
▪Stock
The Consumption posting and Special Stock fields regulate how and what kind of spe-
cial stock is created during the goods receipt process.
▪Account determination
The account determination related attributes ensure how and how many accounts 
are used when creating a goods receipt. The Acct modification field controls the 
account determination, and the ID: AcctAssgt Scrn field controls whether there is a 
single or multiple account assignment.


<!-- Page 109 -->

3 Configuring Inventory Management
110
Figure 3.33  Account Assignment Details
3.1.5    Logistics Execution
Figure 3.34 shows the IMG node that controls decentralized warehouse management
integration, which you can access via the menu path Logistics Execution • Decentralized 
WMS Integration. Here, you activate your warehouse under the Application subnode 
after assigning it to a storage location when setting up the enterprise structure.
Decentralized warehouse management allows you to include third-party logistics pro-
viders or external warehouse management software (see Chapter 9, Section 9.3.2).
Figure 3.34  Decentralized WMS Integration Node
Figure 3.35 displays the assignment between plant (Plnt)/storage location (Stor) and a 
previously defined warehouse number (Wh…) in the enterprise structure configuration


<!-- Page 110 -->

111
3.1 Implementation Guide Configuration
(Section 3.1.2). Multiple storage locations in one plant can be linked to one external 
warehouse number.
Figure 3.35  Assignment of Warehouse Number to Plant/Storage Location
Then you set up your technical interfaces and define your distribution model. After syn-
chronizing the inventory stock between the storage location and the decentralized 
warehouse, you can activate the configuration per warehouse by selecting the External 
WMS checkbox, as shown in Figure 3.36.
Figure 3.36  Activating the Warehouse Number
3.1.6    Production Planning
This section explains how to configure the essential entities used in production plan-
ning (see Chapter 4). Figure 3.37 shows the Production IMG node, which you can access 
directly from the IMG root. It contains the configuration of most of the master data 
objects used in production planning, as follows (see Chapter 4, Section 4.2):
▪Bill of materials (BOM)
Describes what components a material is made of in a hierarchical structure.
▪Work center
Describes where and how a production step is executed.
▪Routing
Describes how a material is made.
 
Further Resources
For the purposes of this book, we’ll walk through production planning configuration 
only as is relevant to inventory management, and at a higher level. For a comprehensive 
guide on production planning, we recommend Production Planning with SAP S/4HANA
by Jawad Akhtar (SAP PRESS, 2025).


<!-- Page 111 -->

3 Configuring Inventory Management
112
Figure 3.37  Basic Data Node
The Production Planning IMG node in Figure 3.38 contains two subnodes. Demand 
Management allows you to configure planned independent requirements (PIRs), which 
are explained in Chapter 4, Section 4.6. Master Product Scheduling allows you to config-
ure the MRP strategy with the same name (see Chapter 4, Section 4.7).
Figure 3.38  Production Planning Node
One key activity is to define the MRP controller, which must be assigned to material 
master records in the MRP view (see Chapter 4). Plant and MRP controller pairs are used 
as areas of responsibility in end user SAP Fiori app personalization to define a set of


<!-- Page 112 -->

113
3.1 Implementation Guide Configuration
materials an end user is responsible for from a material planner’s perspective (see Chap-
ter 4, Section 4.7). Configuring MRP controllers is normally done on each SAP S/4HANA 
system separately.
Figure 3.39 contains all the IMG activities necessary to configure the MRP process in SAP 
S/4HANA.
Figure 3.39  MRP Node


<!-- Page 113 -->

3 Configuring Inventory Management
114
Let’s break down the key subnodes to configure:
▪Plant Parameters
Configure all planning parameters per plant, such as number ranges, MRP controller, 
special procurement, planned order conversion, BOM explosion, external procure-
ment, and performance and rescheduling.
Figure 3.40 shows the plant-dependent settings in production planning:
– Document settings: Configuration related to documents entails number range 
intervals, default values, or document conversion rules.
– ATP checking rules: If a process step requires an availability check (e.g., dependent 
requirements, back orders), an ATP checking rule needs to be provided.
– BOM exploration: BOM exploration defines how and when BOMs are evaluated 
during the MRP run.
– MRP controller: As mentioned previously in this section, the MRP controller role 
is in charge of material flow in the planning process.
– Available stocks: Available stocks and special procurement define how MRP eval-
uates existing stocks and creates external requirements.
Figure 3.40  Plant-Dependent Settings
You’ll find the same IMG activities separated across several nodes under the Produc-
tion node. However, the Plant Parameters node allows you to execute and keep track 
of all the parameter settings per one selected plant, as shown in Figure 3.41.
Plant 0001
ATP
Checking
Rules
Rescheduling
BOM
Header
Subassembly
1
Item 1
Item 2
Subassembly
2
Item 3
BOM Exploration
Document
Settings
MRP Controller
Available
Stocks


<!-- Page 114 -->

115
3.1 Implementation Guide Configuration
Figure 3.41  Plant Parameters for a Selected Plant
▪Master Data
Helps you define MRP areas. Basically, you can plan with MRP on the plant level (old 
approach used in SAP ERP) or on the MRP area level. MRP areas can be of three differ-
ent types:
– Plant type: Equals the old approach and means a planning run is carried out on 
plant level. In this case, the MRP area key must equal the plant key.
– Storage location type: Allows planning runs on the storage location level. One 
storage location must be assigned to only one MRP area. The Define MRP Areas for 
Plant/Storage Location IMG activity is used for this configuration.
– Subcontracting type: Allows you to carry out planning runs for subcontractors. 
This configuration (found in the Define MRP Areas for Subcontractors IMG activ-
ity) needs to be repeated on the productive system because the subcontractor 
business partner number isn’t necessarily identical on two SAP S/4HANA systems.
After the MRP areas are created in these activities, they must be assigned to the mate-
rial master record in the MRP view (see Chapter 4, Section 4.3.2).
▪MRP Calculation
Below the MRP Calculation node, you’ll find the IMG activity Define Rescheduling 
Check. In this activity, you set up the rescheduling check used to detect MRP situa-
tions requiring rescheduling of MRP (see Chapter 4, Section 4.7.1 for more details).


<!-- Page 115 -->

3 Configuring Inventory Management
116
▪Demand-Driven Replenishment
Allows you to choose the lead time calculation method, as shown in Figure 3.42. You 
can use the historic average or a machine learning model (Chapter 4, Section 4.8).
Figure 3.42  Demand-Driven Replenishment Node
▪Shop Floor Control
Allows you to configure the production order with the Order subnode plus number 
ranges for confirmations, reservations, and operations and capacity requirements 
(see Figure 3.43). Confirmations can be configured below the Operations node.
Figure 3.43  Shop Floor Control Node
▪Kanban
Contains all Kanban-specific configuration options (see Figure 3.44). Notably, you 
execute Maintain Number Range Objects for Control Cycle and Define Number Range 
for Kanban ID Number.
▪Production Planning for Process Industries
Reflects the configuration activities required in SAP S/4HANA (see Figure 3.45). You’ll 
notice that there are just a few additional features compared to the discrete indus-
tries described so far. The most prominent one is the Process Order as the counter-
part of the production order.


<!-- Page 116 -->

117
3.1 Implementation Guide Configuration
Figure 3.44  Kanban Node
Figure 3.45  Production Planning for Process Industry Node
3.1.7    Stock Transport
Stock transports are a crucial element of a distributed and resilient supply chain. How 
they are orchestrated depends on geographical, economical, and legal boundaries. In 
case source and target belong to one legal entity, an orchestration can be based on 
inventory management-only postings (i.e., without stock transport orders) or with 
stock transport orders. If more than one legal entity is involved, stock transport orders 
are virtually inevitable. If a complex orchestration of multiple locations is required, 
then advanced intercompany stock transfers may be the method of choice.
Stock transfer postings are a major part of your logistic processes if you have more than 
one plant and need to move goods between these plants. Figure 3.46 displays the 
involved entities: an issuing plant and a receiving plant. During the transfer, the 
involved stock might be recorded in the SAP S/4HANA system as stock in transit. In fact, 
the process can be quite complex depending on whether the issue plant and receiving


<!-- Page 117 -->

3 Configuring Inventory Management
118
plant belong to the same company code (Section 3.1.2), whether a purchase order is used, 
or whether a deliver document is involved.
Figure 3.46  Stock Transfer Basics
Table 3.2 and Table 3.3 list all possible variants of the stock transfer process. Basically, 
you can distinguish between stock transfers without a stock transport order (Table 3.2) 
and stock transfers with a stock transport order (Table 3.3).
The first group is solely based on material document postings and the movement types 
that are described in Section 3.1.3. Table 3.2 lists all aspects of the material document 
postings. In addition, you can directly transfer inventory with some special stock types 
with movement type 301, and the stock in transfer stock type at the plant level, which 
is created by movement type 303, doesn’t hold any batch information.
Stock transport orders are purchase orders with a dedicated purchase order type. As you 
can create your own purchase order type, and SAP S/4HANA delivers some purchase 
order types linked to stock transport orders, the purchase order type UB and the asso-
ciated delivery types and movement types mentioned in Table 3.3 are just the most 
common examples.
Aspects
One-Step Plant-to-Plant
Two-Step Plant-to-Plant
Movement type
301: Transfer plant-to-plant
▪303: Removal from stor-
age
▪305: Placement in storage
Price calculation
Valuation in issuing plant
Able to be planned
Reservation
–
Stock type after goods issue
–
Stock in transfer at plant 
level
Delivery costs
No
Cross-company code
Company code clearing
Table 3.2  Stock Transfer without Stock Transport Order 
Plant 0001
Plant 0002
Issuing Plant
Stock in Transit
Receiving Plant


<!-- Page 118 -->

119
3.1 Implementation Guide Configuration
You can choose to create stock transport orders with or without a delivery document. 
The second variant creates the goods issue while processing the outbound delivery doc-
ument. If involved plants don’t belong to the same company code, a clearing between 
the company codes must exist in controlling or the posting is rejected. Alternatively, 
you can use purchase order type NB to create an ordinary purchase order, including 
pricing and billing/invoice verification, in the issuing/receiving plant.
Table 3.3  Stock Transfer with Stock Transport Order 
Aspects
Stock Transfer 
without Delivery
Stock Transfer with 
Delivery
Stock Transfer with 
Delivery and Billing
Purchase order type/
item type
Purchase orde r
Purchase orde r
Purchase orde r
type: NB
Item type: Empty/
U
type: UB
type: UB
Item type: U
Item type: U
Sales and distribu-
tion delivery type
–
NL
NLCC
Sales and distribu-
tion scheduling line 
category
–
NN
NC
Billing type, docu-
ment type material 
management-
invoice v
tion
–
–
IV, RE
Price calculation
Valuation in issuing plant
Pricing in materials 
management/sales 
and distribution
Movement type
351: Goods issue
101: Good s
receipt
641/647: Good s
643/645: Good s
issue
issue
101: Good s
101: Good s
receipt
receipt
Cross-company code
Company code clearing
Revenue/clearing 
account
Able to be planned
Stock transport order
Stock type after 
Stock in transit
goods issue
Delivery costs
Yes


<!-- Page 119 -->

3 Configuring Inventory Management
120
Note
It’s not possible to lose stock in transit inventory. If there is an inventory difference 
between goods issue and goods receipt, you need to either reduce the goods issue quan-
tity or increase the goods receipt quantity with subsequent scrapping. Movement types
557 and 558 are reserved to correct rounding errors.
Figure 3.47 shows the IMG activities directly related to configuring the stock transport 
order process in SAP S/4HANA, which you can find via the menu path Materials 
Management • Purchasing • Purchase Order • Set Up Stock Transport Order. The ship-
ping data is relevant if you use delivery documents in your stock transfer process. The 
checking rules allow you to use available-to-promise (ATP) checks when creating stock 
transfers.
Figure 3.47  Set Up Stock Transport Order Node
Most important are the following activities for configuration:
▪Configure Delivery Type & Availability Check Procedure by Plant
Allows you to set up the delivery-related parameters listed earlier in Table 3.2 and
Table 3.3. Figure 3.48 shows how to configure the purchase order type of stock trans-
port orders accordingly. You can use the defaults provided by SAP as starting points
to implement the process.
Figure 3.48  Configure Delivery Type and Availability Check Procedure by Plant
▪Assign Document Type, One-Step Procedure, Underdelivery Tolerance
Allows you to set defaults to streamline the process execution in the SAP S/4HANA
system. After defining the purchase order type of stock transport orders, you can


<!-- Page 120 -->

121
3.1 Implementation Guide Configuration
assign them as the default to a combination of supplying plant (SPlt) and receiving 
plant (Plnt), as shown in Figure 3.49.
Figure 3.49  Assign Document Type, One-Step Procedure, Underdelivery Tolerance
 
Note
If the stock transport order type of a stock transfer between two dedicated plants is 
unambiguously defined—meaning there is only one stock transport order type config-
ured for the combination of issuing and receiving plant, or a default stock transport 
order type is set—the Stock Transfer – Cross Plant app (F1957) in SAP Fiori offers a one-
click stock transport order creation function.
With advanced intercompany stock transfer, you can transfer stock within a legal group 
and monitor the process with the Monitor Value Chains app (F4854). Figure 3.50 out-
lines how a specific purchase order (PO) is created on the receiving side and triggers a 
specific sales order (SO) plus an outbound delivery (OD) with subsequent goods issue 
(GI) on the delivering side. When receiving the goods, an inbound delivery (ID) with a 
subsequent goods receipt (GR) is created, and in parallel, a customer invoice (CI) is cre-
ated on the delivering side and a supplier invoice (SI) is created on the receiving side.
Figure 3.50  Advanced Intercompany Stock Transfer Between Receiving (Left) and Delivering 
Company Code (Right)
 
Further Resources
Further details on advanced intercompany stock transfer are beyond the scope of our 
inventory management focus in this book. For complete setup instructions, refer to SAP 
Note 3233845.
Plant 2010
Company Code 2000 (Receiving)
Group
Plant 2010
Company Code 2000 (Delivering)
PO
SO
SI
CI
GR
ID
GI
OD


<!-- Page 121 -->

3 Configuring Inventory Management
122
3.2    Cross-Topics
The topics that we’ll cover in this section are optional extensions to inventory processes 
based on the material attributes. These extensions help to match business require-
ments such as tracking the ingredients of food products (batches), ensuring uniqueness 
of product instances (serial number), simplifying handling of goods packaged together 
(handling units), or valuating material instances based on origin (split valuation). As 
each topic could receive a dedicated book in their own right, we’ll provide only a high-
level overview in the following sections.
3.2.1    Batches
Batches describe a set of material instances with identical characteristics. For example, 
a batch might be 20 PCs with a maximum shelf life of 100 days. Batch management in 
SAP S/4HANA comes along with a fixed set of characteristics such as the batch number, 
creation date, shelf-life date, or deletion indicator. In addition, batch management 
allows the definition of a virtually arbitrary set of characteristics per batch of different 
technical types (text, indicatory, quantity units, etc.). Batch numbers are either created 
automatically from number range intervals or manually. Figure 3.51 shows the various 
aspects of a batch. You can see its capability to serve as a stock identifying field (upper 
left) and as a split valuation criteria (Section 3.2.4). At the bottom, you can see an exam-
ple of the lifecycle, in which (based on the configuration in logistics) the batch is auto-
matically created, manually selected, or automatically determined.
Figure 3.51  Batch Handling and Lifecycle
Material Stock
Automatically
created 
Manually
selected 
Automatic batch
determination 
Material Value
SLED: 31.09.2025
Origin: GB
SLED: 31.10.2025
Origin:  FR
SLED: 30.11.2025
Origin: US
SLED: 31.12.2025
Origin: US
2 PC Batch 3
5 PC Batch 2
1 PC Batch 1
5 PC Batch 4
Goods Receipt
Transfer Posting
Goods Issue
$15 Batch 4
$1 Batch 3
$5 Batch 2
$2 Batch 1


<!-- Page 122 -->

123
3.2 Cross-Topics
You can enable batch management in your system under Logistics – General • Batch 
Management (see Figure 3.52). From there, you can define whether a batch level is main-
tained per client, per material, or per material plant combination. In addition, you can 
decide whether a material is subjected to batch management in the product master (see 
Figure 3.53).
Figure 3.52  Batch Management IMG Subtree
Whether a material is subjected to batch management is defined in material master’s 
Plant view, as shown in Figure 3.53. You can select the Batch Management checkbox and 
the Batch management(Plant) checkbox.
Figure 3.53  Material Master, Plant View, General Data
When you enable batch management, the batch acts as a stock identifying field and 
becomes mandatory in all inventory transactions of the particular material in the par-
ticular plant. Additional configuration settings help to control batch management


<!-- Page 123 -->

3 Configuring Inventory Management
124
depending on the respective process (Section 3.1.3). Batches can be tracked across the 
entire supply chain, including procurement, production, inventory, warehousing, and 
sales. Batches may also impact the material valuation, as each batch of a material may 
have a different material price. A material batch with zero stock quantity may exist, 
which means a batch can be created without any material document posting.
If batches are activated in an SAP S/4HANA system, their automatic determination 
during logistics processes can be configured based on rules in the batch master.
Within the inventory processes, batches are normally referenced by the batch number 
only. If needed, additional characteristics may be shown, or a link to the batch master 
may be provided.
 
Note
You can use shelf-life expiration date without batch management, but this isn’t recom-
mended, because it’s a static attribute valid for the entire material stock irrespective of 
when the stock is produced or procured.
3.2.2    Serial Numbers
A serial number identifies a single instance of a material. The serial number can be created 
automatically or manually. Unlike batches with their characteristics, any semantic must 
be coded in the serial number itself. Serial number configuration isn’t centralized but 
rather is linked to the individual process within the IMG (see our example in Figure 3.54).
Figure 3.54  Example Serial Number Configuration for Shipping
Whether an inventory process requires serial number(s) depends on the serial number 
profile in the material master. Go to Transaction MM02 and navigate to the Plant view 
to arrive at the screen, as shown in Figure 3.55. A serial number always refers to the mate-
rial’s base unit of measure.
Figure 3.55  General Plant Parameters with Serial Number Profile SNPA


<!-- Page 124 -->

125
3.2 Cross-Topics
If the number of active serial numbers per material doesn’t match the material stock 
quantity, the material stock is in an inconsistent state. Serial numbers are usually dis-
played on their own tab in inventory transactions.
3.2.3    Handling Units
A handling unit is a combination of materials and packing materials created based on 
packing instructions. Each handling unit has a unique identification number and some 
additional attributes such as dimensions or status. Handling units may be nested, and 
any information about the packed material is always available. Figure 3.56 illustrates the 
handling unit lifecycle, starting with its creation (e.g., packing after production) based 
on predefined rules, then its use in logistics transactions (e.g., transport into ware-
house), and finally its consumption (e.g., by goods issue).
Figure 3.56  Handling Unit Lifecycle
The configuration activities on handling units can be found under Logistics – General • 
Handling Unit Management (see Figure 3.57).
Figure 3.57  Handling Unit Configuration Subtree
Handling units are usually handled by many separate transactions and aren’t inte-
grated into the core logistics transactions that we’ll discuss.
Pack HU
Use HU in 
logistics
HU 
consumption 
• Unique identifier
• Tagged with 
additional attributes
• Rule-based packaging
• Automatic tracking 
enabled


<!-- Page 125 -->

3 Configuring Inventory Management
126
3.2.4    Split Valuation
Split valuation allows you to segment a material’s stock based on configurable valua-
tion types belonging to the same valuation category. For example, if you would like to 
distinguish the value of a material based on its country of origin, you can define the val-
uation category H (origin) with the valuation types Germany, USA, Great Britain, and 
France. Or, say you would like to distinguish whether a material stock is externally pro-
cured or produced in-house by the valuation category B and the valuation types 01 (in-
house) and 02 (externally procured). Each valuation type may have a different inven-
tory value.
Valuation category and valuation types are defined globally per system and subse-
quently locally per plant/valuation area via the menu path Materials Management • 
Valuation and Account Assignment • Split Valuation (see Figure 3.58). By selecting Con-
figure Split Valuation, you can execute all important configuration activities.
Figure 3.58  Split Valuation Subtree
Within the Accounting view of the material master, a material can be activated by 
assigning a Valuation Category per material valuation area, as shown in Figure 3.59. The 
valuation category X is reserved for batches.
Figure 3.59  Material Master, Account View, General Data with Valuation Category B
When the price control S (standard price) is used, you can enter the different values 
manually in the Accounting view of the material master. If the moving average price (M) 
is activated for price control, the inventory value is calculated based on the moving 
average during each transaction.
If activated, the valuation type acts as a stock identifying field in all inventory transac-
tions. Because the valuation category and its valuation types can be arbitrarily defined, 
split valuation is a very powerful tool to subdivide material stock on an individually 
defined attribute in logistics with optional impact on material valuation in finance.


<!-- Page 126 -->

127
3.3 Generic Cross-Functions
3.3    Generic Cross-Functions
With activities related to cross-functions, you can configure SAP S/4HANA functions 
that aren’t related to a specific business process but are of a more generic nature. Let’s 
walk through some key functions in the following sections.
3.3.1    Date Functions
Date functions allow you to specify a time period relative to a start date. This configu-
ration is linked to the administrator role in the SAP Fiori launchpad and can be reached 
with the Manage Date Functions app, as shown in Figure 3.60.
Figure 3.60  Simple List of Predefined Date Functions
Date functions are used in various SAP Fiori apps. Although there is a list of SAP-defined 
date functions, end users can also create their own if required.
Click a list item to navigate to the object page of each date function, which displays the 
definition’s details, as shown in Figure 3.61. You can’t edit SAP predefined date func-
tions, but you can create your own here.
To create your own date functions, click the + icon, and you’ll arrive at the screen shown 
in Figure 3.62. You need to provide the mandatory Date Function Name. The various 
options allow you to define a single date or a date range, different kinds of reference 
dates, and a time frame.
 
Note
You can use the predefined date functions as a starting point and then copy them to the 
customer namespace for further adaptations.


<!-- Page 127 -->

3 Configuring Inventory Management
128
Figure 3.61  Object Page of the Selected Date Function
Figure 3.62  Creating a Date Function in the Customer Namespace


<!-- Page 128 -->

129
3.3 Generic Cross-Functions
3.3.2    Responsibility Management
Responsibility management in SAP S/4HANA allows you to define teams consisting of 
one or more team members who will be responsible for a certain business process. One 
prominent consuming application framework is situation handling (see Chapter 2, Sec-
tion 2.3.4, for business motivation, and refer to Section 3.3.3 in this chapter for configu-
ration). SAP S/4HANA contains member functions and team types in its reference 
configuration. Responsibility management in the IMG allows you to extend the refer-
ence configuration.
Figure 3.63 presents the basic attributes of a team in responsibility management. Each 
team has a team type, which is linked to a team category. The team category defines the 
consuming application framework. The responsibility definition of a team is a set of filter 
criteria that express when the team members will be involved in a business process. Typ-
ical filter criteria in the responsibility definition are organizational units, master data 
attributes, or transactional attributes. Each team has at least one team owner who is the 
administrator of the team. The team members are the end users who will take over 
responsibility (and are involved via the consuming application). When the team is 
invoked by the consuming application framework, the framework may submit attributes 
mapping to the filter criteria in the responsibility definition and member functions, 
which might be linked to each team member. The end users only take over responsibility 
if the filter criteria and member function match (see Chapter 4, Section 4.7.9).
Figure 3.63  Attributes of a Team
Figure 3.64 displays the Responsibility Management IMG node with all its subnodes and 
configuration activities:
▪Define Functions/Define Function Profiles
Allows you to create your own member functions if the SAP S/4HANA predelivered 
member functions aren’t sufficient for your business case.
Team Type
Team Category
Responsibility
Definition
Team Owner
Team Member
Link to situation
template
Attribute to
distinguish teams
Filter criteria to
identify team
Administrator
End user optionally
mapped to 1:n
member functions


<!-- Page 129 -->

3 Configuring Inventory Management
130
▪Responsibility Definitions
Allows you to create your custom responsibility definition if the SAP S/4HANA 
shipped definitions need to be extended.
▪Teams and Responsibilities
Allows you to map your custom member function to the SAP S/4HANA Team Cate-
gories and, eventually, with Define Team Types, to create your own team types with 
a predelivered team category.
Figure 3.64  Responsibility Management Node and Activities
After setting up your own member functions and team types, your administrator can 
use them when defining the teams with the Manage Teams and Responsibilities app
(F2412) in SAP Fiori, as shown in Figure 3.65.
Figure 3.65  Manage Teams and Responsibilities App


<!-- Page 130 -->

131
3.3 Generic Cross-Functions
After selecting one item, the detail screen in Figure 3.66 shows how the previously 
described team attributes can be edited. When creating a new team, follow these steps:
1. Select a team Category, which will define the Responsibility Definitions.
2. As an optional second step, enter values for one or many Responsibility Definitions.
3. Add the Team Members. Optionally, you can assign Functions to each team member 
(refer to Figure 3.64).
Chapter 4 and Chapter 5 provide business cases as examples.
Figure 3.66  Detail Screen to Edit a Selected Team
3.3.3    Situation Handling
Situation handling in SAP S/4HANA allows you to define business conditions that trig-
ger all the different types of notifications to a dedicated end user (see Chapter 2, Section 
2.3.4, for business motivation). SAP S/4HANA contains several situation templates that 
need to be copied to create an active situation type in the SAP S/4HANA instance. The 
Manage Situation Types app (F2947) is used by the administrator to create and activate 
situation types.


<!-- Page 131 -->

3 Configuring Inventory Management
132
A situation type contains the following attributes:
▪ID
This ID is the unique key in the system.
▪Status
This option controls whether the situation type is active or not.
▪Conditions
This option defines the filter criteria that will trigger a situation type instance.
▪Batch Job Scheduling
This option defines when the criteria are evaluated during the day if the situation 
template is triggered by batch jobs.
▪In-App Message and Notification
These settings allow you to edit how the situation type instance is displayed to the 
end user in the SAP Fiori app and in the SAP Fiori launchpad notification (see Chapter 
1, Section 1.4).
▪Preview
This option allows you to preview the situation while you’re editing.
▪Notification Recipients
This option allows you to link one or more teams (Section 3.3.2) and set the condi-
tions that identify the to-be-notified team members (i.e., end users).
▪Monitoring
When this option is active, you can monitor the created situation type instance cen-
trally.
Figure 3.67 shows the Manage Situation Types app displaying the Situation Templates
shipped with SAP S/4HANA.
Figure 3.67  Manage Situation Types App: Standard Templates Filtered for One Anchor Object
You can create user-defined situations by copying one of the SAP S/4HANA standard 
templates. After copying the situation template, the situation shows up under the Situa-
tion Types tab. Note that a situation must be enabled on the detail screen to become us-
able (see Figure 3.68).


<!-- Page 132 -->

133
3.3 Generic Cross-Functions
Figure 3.68  Manage Situation Types App: Created Situations Filtered for One Anchor Object
Figure 3.69 shows the detail page in edit mode, which you can access by clicking a result 
item in the table. The Admin Information and the Situation Display areas are outlined 
on the screen, showing the Admin Information fields like ID and Name. The Situation 
Display area is used for editing the visual appearance of the created situation instance. 
It’s preset by the template and can be edited. 
Figure 3.69  Detail Page of a Situation with the Admin Information and In-App Situation 
Message, Notification, and Preview


<!-- Page 133 -->

3 Configuring Inventory Management
134
You can use symbols (displayed with {}) representing attributes of the conditions/cal-
culated fields to populate the texts. The URL and Hyperlink Text fields allow you to pro-
vide a link to an arbitrary website within a situation notification. A situation instance 
can appear in the SAP Fiori launchpad’s notifications, the SAP Fiori app itself, or be sent 
as an e-mail. If you activate the Aggregate Notifications checkbox, all situation in-
stances created by one batch job run will be aggregated into one SAP Fiori launchpad 
notification.
 
Note
The Translate button helps you in creating language-dependent text of the situation 
type.
If the situation template is defined to be triggered by a job, you need to complete the 
next step. To schedule a batch job, go to the Batch Job Scheduling tab, as shown in Figure 
3.70, and set a Time Zone and a time (Start Batch Job At). This evaluates the Conditions
in Figure 3.69 on a daily basis.
Figure 3.70  Batch Job Scheduling Tab
Next, go to the Conditions tab, as shown in Figure 3.71. The filter values on the right-hand 
side control when a situation instance is created during the batch job run. With the pro-
cessing order on the left-hand side, you can also define conditions when the situation
instance should be removed.
 
Note
In our experience, the entered text fragments (Message Details and Secure Notification 
Details) should take into account whether aggregation is active or not.
In the Recipients tab shown in Figure 3.72, you can link the situation to one or more 
teams. As mentioned in Section 3.3.2, only teams with a predefined team category 
linked to the situation template can be assigned as the team of a situation. You can pass 
a Responsibility Definition and Member Function to all teams of a category to select the 
team members to be notified. Responsibility Rules allow you to fine-tune the selection 
of team members.


<!-- Page 134 -->

135
3.3 Generic Cross-Functions
Figure 3.71  Situation Display Area with Condition Tabs
Figure 3.72  Notification Recipients Area with Assigned Team Categories, Responsibility 
Definition, and Member Function
Figure 3.73 shows how you can use the member function to address notifications to dif-
ferent team members depending on the created situation type instance.


<!-- Page 135 -->

3 Configuring Inventory Management
136
Figure 3.73  Working with Identical Team Types
You can use one team with identical filter criteria (i.e., responsibility definitions) or two 
teams with different filter criteria (Section 3.3.2).
Figure 3.74 shows the setup with two different team types. Basically, which setup is 
more convenient depends on the use case. If team members can be solely selected by 
member functions, one team is sufficient. If your team definition requires different 
responsibility definitions, you’ll need to create more than one team.
Figure 3.74  Working with Different Team Types
Inventory
Manager
Warehouse
Clerk
User A
User B
One team with
one filter and user
determination by
member function 
Situation
Instance
Type 110
Situation
Instance
Type 112
Two teams with
different filters and
user determination
by member function 
Situation
Instance
Type 110
Situation
Instance
Type 112
Warehouse
Clerk
User A
Inventory
Manager
User B
Plant
A
Plant
A
Plant
B
Plant
A
MRP
Group
01
Warehouse
Clerk
User A
Situation
Instance
Type 110
Situation
Instance
Type 112
Plant
B
Inventory
Manager
User B
Inventory
Manager
User A
Two teams with
different team types


<!-- Page 136 -->

137
3.3 Generic Cross-Functions
3.3.4    Barcode Scanning
Barcode scanning facilitates the paper-to-digital process in inventory management. 
Ideally, all information needed in inventory processes should be in the system. How-
ever, in the real world, paper-based information is often used when crossing process 
boundaries. When coded in a machine-readable format, such as barcodes, the paper-
based information can easily be transferred into your IT system. SAP S/4HANA supports 
two types of barcodes in transactional inventory management SAP Fiori apps:
▪Simple barcodes
A simple barcode contains the information to just populate one field in the SAP Fiori 
app, such as a purchase order number or material number. Handling of simple bar-
codes is controlled in the personalization settings of the respective SAP Fiori app.
▪Complex barcodes
Complex barcodes contain multiple data coded by a predefined schema like GS1 
(https://www.gs1.org/standards). You can define rules to decompose complex bar-
codes and map the extracted data to semantic fields per SAP Fiori app. For example, 
with one scan you could populate material number, quantity and unit, batch num-
ber, and shelf-life date per goods receipt item.
You can find the barcode scanning configuration activities via menu path Inventory 
Management • Barcode Scanning (see Figure 3.75).
Figure 3.75  Barcode Scanning Configuration
First you start with configuration activity Define Settings for Scanner Hardware, as 
shown in Figure 3.76. You can administrate the hardware settings centrally. Select the 
Enable Barcode Scanning checkbox, and you can choose to enable device cameras and 
external scanners as well. The Use External Scanner setting can be coupled with Blue-
tooth, but their input must be distinguished from the ordinary keyboard input. Two 
options exist:
▪Their input can be detected either by a Prefix/Suffix Character in the input stream (if 
supported by the scanner hardware).
▪Their input can be detected by a maximum Time Interval between the characters 
send to the device. In our example, the external scanner is detected via a Time Inter-
val of 50 milliseconds.
 
Note
As a potential third option, SAPUI5 natively supports some hardware with embedded 
scanning capabilities (see SAP Note 3390217).


<!-- Page 137 -->

3 Configuring Inventory Management
138
Figure 3.76  Default Configuration for Hardware Settings with Device Camera or External 
Scanner
Next, you continue with configuration activity Define Barcode Parsing, as shown in 
Figure 3.77. Here you define the mapping between semantic field and complex barcode 
setting with the help of regular expressions.
Figure 3.77  Default Parsing Rules Representing the GS1 Standard
Each line in the parsing rules maps a Regular Expression (i.e., a sequence of characters 
defining a search pattern) against a Global Field Name. When a barcode is processed, the 
parsing rules are applied until the entire barcode is processed or a match is no longer 
found.


<!-- Page 138 -->

139
3.3 Generic Cross-Functions
 
Note
SAP ships a set of rules representing the GS1 standard, but you can create your own by 
using the predelivered content as a template.
With the configuration activity Assign Parsing and Hardware Settings to SAP Fiori App
in Figure 3.78, you finally assign and activate the mapping rules and the hardware set-
tings per app, which is identified by its app ID (see Chapter 2).
Figure 3.78  Assignment to SAP Fiori App
Afterwards, you can check the configuration result in the personalization settings of the 
respective app, as shown in our example in Figure 3.79. The list of Supported Fields indi-
cates which semantic information of the scanning result can be processed by the SAP 
Fiori app.
Figure 3.79  Scanner Settings Menu of the SAP Fiori App F0843 Personalization Menu


<!-- Page 139 -->

3 Configuring Inventory Management
140
We’ll walk through examples of barcode scanning in action in Chapter 5, Section 5.7.3, 
and Chapter 6, Section 6.8.1.
3.3.5    Extensibility
In SAP S/4HANA, data source extensibility supports customers in extending existing user 
interfaces (UIs) (SAP Fiori, e-mail templates, Adobe forms, etc.) or technical interfaces 
(OData services, SOAP services, Business Application Programming Interfaces [BAPIs], 
IDocs, etc.) with additional SAP-owned fields. Custom field extensibility, on the other 
hand,  is used with customer-created fields (see Figure 3.80). Furthermore, SAP S/4HANA 
allows you to extend the existing business logic at strategic hooks (custom logic). As an 
administrator, you can perform extensibility via the Custom Fields app (F1481) in SAP 
Fiori. We’ll start with custom field extensibility as part of on-stack extensibility in the 
next section. (We’ll also return to the topic of extensibility in Chapter 9, Section 9.1, as 
part of our discussion of inventory management in the broader context of SAP Business 
Suite.)
Figure 3.80  Field Extensibility Options in SAP S/4HANA
Custom Field Extensibility
Figure 3.81 shows the Custom Fields tab used to manage custom field extensibility. You 
see all the created custom fields, their Business Context, and their Status. Fields that 
aren’t Published can’t be used for extensibility. The Business Context determines which 
interfaces can enable a custom field.
As a first step, you need to create a custom field by clicking the + icon, as shown in Figure 
3.81. You need to fill in some mandatory fields (see Figure 3.82). In our example, we’ve 
used the business context Accounting: Coding Block, and we’ve entered “My Custom 
Field” as the Label. 
SAP1
SAP2
SAP3
Custom
SAP1
SAP2
SAP3
Custom
Customer Fields
Extension
SAP Data Source
Extension
SAP Standard
Fields
User Interface
Database


<!-- Page 140 -->

141
3.3 Generic Cross-Functions
Figure 3.81  Custom Fields: List of All Implemented Custom Fields
Figure 3.82  Creating a New Custom Field


<!-- Page 141 -->

3 Configuring Inventory Management
142
The mandatory Type field controls the rendering on any UI. If you select Code List, as 
we’ve done, you must provide the single key-value pairs. There are many other types, 
such as quantity and value fields, checkboxes, and various numerical and text field 
types.
Click the Create and Edit button to create the field. After creating the field, you can edit 
attributes or create a translation of texts in the General Information tab by clicking the 
Translation button, as shown in Figure 3.83.
Figure 3.83  Editing a New Custom Field
As a second step, you need to add the created custom field to an interface technology. 
The other sections are populated based on the business context and offer the UI or tech-
nical interface that can enable the field (see Figure 3.84). Often, the SAP Fiori app docu-
mentation gives hints to the desired business context and requested interface to be 
extended. To activate the custom field for a particular usage, the changes must be acti-
vated by clicking the Enable Usage button.
 
Note
Keep in mind that some changes can’t be reverted after publishing because publishing 
entails changes to database objects. After the database objects are enhanced, the 
enhancement can’t be deleted.


<!-- Page 142 -->

143
3.3 Generic Cross-Functions
Figure 3.84  Enabling the Custom Field
Data Source Extensibility
Figure 3.85 displays the Data Source Extensions tab with the option to create a new 
extension by clicking the + icon. The Extended Data Source column shows the ID of the 
extended interface. The extension isn’t visible unless the Status is Published.
Figure 3.85  Custom Fields: List of All Implemented Data Sources
Click the arrow icon of each item to access the details of an extension, as shown in 
Figure 3.86. Here, you can see the Selected Fields on the right-hand side, which become 
visible in the interface due to the data source extension. The Field Path indicates the 
source of the field on the left-hand side, where all Available Fields are listed in a hierar-
chy. When you select your fields from Available Fields, they become part of the exten-
sion. Label and Tooltip allow you to define your own on-screen appearance.


<!-- Page 143 -->

3 Configuring Inventory Management
144
Figure 3.86  Field Selection in Data Source Extensibility
To publish the extension, click the Publish button (not shown). The results, as shown in 
Figure 3.87, show that within the filter option, four fields originate in the data source 
extensibility, and one is an extended custom field (MyCustomField).
Figure 3.87  Results of Data Source (Upper Rectangle) and Custom Field (Lower Rectangle) 
Extension
 
Note
In some SAP Fiori apps, you need to complete the extension process by laying out the 
extended field via runtime adaptation (RTA), as we’ll discuss later in this section.


<!-- Page 144 -->

145
3.3 Generic Cross-Functions
Custom Logic
In the Custom Logic app (F6957), you can implement your own business logic at pre-
defined SAP S/4HANA hooks.
In our first example, we’ll showcase the implementation steps to use a custom move-
ment type for scrapping in the Manage Stock app (F1062), as shown in Figure 3.88. Here, 
you can see custom movement type Y51 was created after copying movement type 551.
Figure 3.88  Custom Movement Type
SAP Fiori’s business logic extension concept differs from the extension concept of the 
web GUI. For material document postings, custom movement types can be directly 
selected in the Post Goods Movement app (Transaction MIGO). SAP Fiori offers more 
granular extension capabilities, allowing customers to code rules for when the custom 
movement type is consumable. First, we need to open the app and create a new entry 
by clicking the Create button or edit an existing entry (list item details) for the exten-
sion point MMIM_TRANSFER_PROVIDE_DATA, as shown in Figure 3.89.
Figure 3.89  Custom Logic App with Entry for Extension Point MMIM_TRANSFER_PROVIDE_
DATA


<!-- Page 145 -->

3 Configuring Inventory Management
146
On the detail page in Figure 3.90, you can see the status of your implementation and 
whether it’s been transported to the next system. Before you open the code editor, you 
should take a look at the available documentation by clicking View Documentation.
Figure 3.90  Details for Custom Logic Implementation
The text in Figure 3.91 explains which applications allow you to extend the business 
logic and which import and changing parameters are available. It also provides an 
example with code snippets (not shown).
Figure 3.91  Documentation with Examples


<!-- Page 146 -->

147
3.3 Generic Cross-Functions
Next, open the source code editor by clicking Open Code Editor (refer back to Figure 
3.90). You’ll enter a split column layout with the actual code editor on the left-hand side 
and the method’s signature description on the right-hand side (see Figure 3.92). You can 
switch between the Importing parameters in Figure 3.92 and the Changing parameters 
with the dropdown control, as shown in Figure 3.93. The Name, Description, and the tech-
nical Type of each parameter is shown. Any nested parameter types can be expanded by 
clicking on the hierarchy nodes.
Figure 3.92  Source Code Editor with Importing Parameters
Figure 3.93  Source Code Editor with Changing Parameters
When switching to the actual code editor on the left-hand side of the split column lay-
out in Figure 3.94, the implemented coding becomes visible. Editing is supported by a 
code snippet wizard and pieces of example code. In our example, the code shows that 
in case of scrapping with movement type 551, the list of additionally selectable custom 
movement types is enhanced with two entries Y51 (refer back to Figure 3.88) and Z51.
Figure 3.94 shows how the enhanced logic leads to an additional dropdown list for 
movement type in the Manage Stock app, if Scrapping is selected as the Stock Change 
type (see Figure 3.95).


<!-- Page 147 -->

3 Configuring Inventory Management
148
Figure 3.94  Source Code Editor with Implemented Code
Figure 3.95  Custom Movement Type During Scrapping
When selecting entry scrapping (copy 551), the posted material document item (see 
Figure 3.96) contains the custom movement type from Figure 3.88.


<!-- Page 148 -->

149
3.3 Generic Cross-Functions
Figure 3.96  Posted Material Document with Scrapping via Movement Type Y51
Let’s look at a second example that shows how to implement a custom validation before 
posting a goods receipt via the SAP Fiori-like app, Goods Receipt for Purchasing Docu-
ment (F0843). For this use case, we must create a custom logic implementation for the 
extension point MMIM_GR4XY_CHECK_DATA. Figure 3.97 shows a very simple imple-
mentation where, if the posting date equals March 31, 2025, the posting is rejected with 
an error message.
Figure 3.97  Source Code of the Validation


<!-- Page 149 -->

3 Configuring Inventory Management
150
You can use this enhancement point to validate the input of various header and item 
fields, including custom fields during goods receipt posting by the apps we’ll discuss in 
detail in Chapter 6. The example implementation leads to an error message when post-
ing a goods receipt and blocks posting, as shown in Figure 3.98.
Figure 3.98  Post Goods Receipt for Purchasing Document with Posting Date 03/31/2025
Table 3.4 provides an overview of the extension options for custom logic in inventory 
management applications.
Extension Point
Purpose
Applications
MMIM_GR4XY_PROVIDE_DATA
Provides custom data, includ-
ing custom movement types 
merged into the selected 
source document
F0843, F3310, F6352, 
F2502, F5476
MMIM_GR4XY_CHECK_DATA
Checks user input before the 
post operation is executed 
and returns a blocking error 
message, if needed
F0843, F3310, F6352, 
F2502, F5476, F3244
MMIM_TRANSFER_PROVIDE_DATA
Provides custom movement 
types as a select option
F1061, F1062, F1957
MMIM_TRANSFER_CHECK_DATA
Checks user input before the 
post operation is executed 
and returns a blocking error 
message, if needed
F1061, F1062, F1957
Table 3.4  Extension Points


<!-- Page 150 -->

151
3.3 Generic Cross-Functions
Runtime Adaptation
Until now, we’ve only described the means to extend the data flow from the database 
to the user or technical interfaces and back. However, another category of extensibility 
is to adapt the UI to end user needs. As shown in Figure 3.99, an administrator logged 
on to the SAP Fiori launchpad can switch the SAP Fiori app to RTA mode by clicking the 
Adapt UI option in the Me Area of the SAP Fiori launchpad. In RTA, you can change 
labels, hide fields, and adapt layouts. 
You can also place custom fields on the UI so that they can be used as input fields in SAP 
Fiori apps. RTA is a powerful tool that allows you to create sustainable adaptations of 
SAP Fiori apps. While in RTA mode, you can always switch back to navigation mode. You 
can reset or save your changes so that they become permanent for all end users.
Note
Be careful when hiding mandatory fields: an SAP Fiori app might become unusable.
BADI_MMIM_CHECK_MATDOC_ITEM
Checks user input before the 
post operation is executed 
and returns a blocking error 
message, if needed
F0843, F3310, F6352, 
F2502, F5476, F3244, 
F1061, F1062, F1957, 
MIGO
MMIM_BATCH_MASTER
Allows you to change master 
data of batches provided with 
the material document 
before posting
F0843, F3310, F6352, 
F2502, F5476, F3244, 
F1061, F1062, F1957, 
MIGO
MMIM_HEAD_CHECK_DATA
Checks document header 
data
MIGO
MMIM_HEAD_PROVIDE_DATA
Provides custom data to the 
document header
MIGO
MMIM_ITEM_CHECK_DATA
Checks data of the document 
item
MIGO
MMIM_ITEM_PROVIDE_DATA
Provides custom data to the 
document items
MIGO
Extension Point
Purpose
Applications
Table 3.4  Extension Points (Cont.)


<!-- Page 151 -->

3 Configuring Inventory Management
152
Figure 3.99  Activating UI Adaptation and Switching an SAP Fiori App to Runtime 
Adaptation Mode
Creating an Application Variant
Unlike RTA mode, creating an application variant creates new coding artifacts in the 
system and requires SAP Business Application Studio. Technically, a copy of the original 
application is created, which utilizes the identical OData service. You can edit the layout 
of the copy or remove existing sections or create new section with your own controller 
logic. After deployment of the application variant, SAP Fiori launchpad artifacts must 
be created and eventually assigned to a business catalog role to become consumable as 
a new SAP Fiori app for your end users.
 
Further Resources
You can find more detailed documentation for creating application variants at https://
help.sap.com/docs/bas/developing-sap-fiori-app-in-sap-business-application-studio/
extending-sap-fiori-application.
3.4    Servers
In general, the SAP S/4HANA system architecture is based on two main entities. On the 
one hand, all the UI-related technology is part of the frontend server, and on the other 
hand, the more business logic- and database logic-dependent data is part of the backend


<!-- Page 152 -->

153
3.3 Generic Cross-Functions
server. Technically, both servers can be installed on the same platform but don’t have 
to be. In SAP S/4HANA Cloud, the frontend apps are usually also installed on the same 
tenant as the backend stack (see Chapter 9). Figure 3.100 outlines the high-level server 
stack architecture of SAP S/4HANA and its different layers.
Let’s walk through configuration for both the frontend and backend servers.
Figure 3.100  Server Architecture of SAP S/4HANA
3.4.1    Frontend
The SAP S/4HANA frontend server contains the SAPUI5 and SAP Fiori app objects from 
a technical point of view and is connected to the backend server via the OData protocol. 
Therefore, the system’s entry point for all connected backend systems is given by the 
SAP Fiori launchpad hosted on the frontend server.
The available SAP Fiori apps are represented as tiles in the SAP Fiori launchpad. To 
enable the use of a certain tile, a business role/business catalog must be assigned to the 
related end user. More details regarding the available business roles and business cata-
logs are described in Section 3.6.
To enable the data connection and access to the backend system, the related OData ser-
vices have to be activated on the frontend server. Activation can be performed manu-
ally or per mass job. The OData services required for the single SAP Fiori app are listed 
in the SAP Fiori apps reference library (see Figure 3.101), which can be found via the 
menu path Implementation Information • Configuration • ODATA Service(s)).
Frontend Server (ABAP)
Backend Server (ABAP)
SAP HANA
SAP Mobile
Client
R
Desktop
Browser
R
Mobile Device
R
R
R


<!-- Page 153 -->

3 Configuring Inventory Management
154
To activate the relevant OData services, you can use the IMG activity Activate and Main-
tain Services, which you can find by following menu path ABAP Platform • SAP Gateway •
OData Channel • Administration • General Settings • Activate and Maintain Services.
Figure 3.101  Example of SAP Fiori Apps Reference Library: OData Services
Once you click the IMG activity, you enter the overview screen containing all of the 
already activated OData services. To add and activate a new service, click the Add Service
button, as shown in Figure 3.102.
Figure 3.102  Add OData Service
In the following screen (see Figure 3.103), enter the related system alias that reflects the 
connection to the backend system and press (Enter). You can also enter the technical 
name of the service you want to activate (MMIM_GR4PO*, in our example). Then, press 
(Enter), and all services that aren’t currently active and meet the selection criteria will 
be displayed in the table beneath the selection fields.
Figure 3.103  List of OData Services to Activate


<!-- Page 154 -->

155
3.3 Generic Cross-Functions
Now, select the OData service that you want to activate and click the Add Selected Ser-
vices button.
 
Note
SAP recommends installing frontend server components and backend server compo-
nents in one instance.
3.4.2    Backend
The SAP S/4HANA frontend server is connected to a backend server in SAP S/4HANA. In 
addition, for the backend server, the SAP Fiori apps reference library provides informa-
tion about the required prerequisites for a certain SAP Fiori app.
Figure 3.104 shows an example from the SAP Fiori apps reference library for important 
IMPLEMENTATION INFORMATION.
Figure 3.104  Example of Backend Server Information in SAP Fiori Apps Reference Library


<!-- Page 155 -->

3 Configuring Inventory Management
156
The backend server owns the OData service repository objects that represent the inter-
faces for external communication. The communication isn’t limited to the connection 
of the UI presentation layer (i.e., the frontend server); warehouses of Internet of Things 
(IoT) devices also can be connected to the SAP S/4HANA backend server via interfaces. 
In this sense, not only is the OData protocol available but also additional communica-
tion protocols, as described in Section 3.5.
3.5    Basic Interfaces
Inventory management takes records about companies’ material movements and 
stock figures. The business processes around the goods of a company are reflected by 
any goods movement, which must be recorded in the system. From a business perspec-
tive, the material flow can be distinguished between inbound and outbound material 
flows. For these kinds of movements, SAP S/4HANA provides interfaces so that manu-
facturing execution systems (MES) or subsidiary systems also can be connected, and 
their material flow can be recorded in a central SAP S/4HANA system. Example of such 
hybrid scenarios are given in Chapter 9, Section 9.3.
From a technical point of view, several technologies are supported for connecting to 
inventory management in SAP S/4HANA:
▪BAPIs
▪OData
▪SOAP
With these services, the inventory management business objects can be accessed from 
outside, and external systems can get updated in case of relevant activities.
The following inventory management business objects provide interfaces for external 
communication:
▪Material document
▪Physical inventory document
▪Reservation
▪Stock
To gain insight into these interfaces, SAP Business Accelerator Hub (see Chapter 9, Sec-
tion 9.1.3, or go http://s-prs.co/v489202) is a good starting point for research, as shown 
in Figure 3.105.
By just entering the related business object, you get the available interfaces as search 
results based on the used protocol (e.g., OData or SOAP). Details about the structure and 
definition of a certain interface can be checked by navigating into the details of a search 
result, as shown in Figure 3.106.


<!-- Page 156 -->

157
3.5 Basic Interfaces
Figure 3.105  SAP Business Accelerator Hub
Figure 3.106  Interface Details in SAP Business Accelerator Hub


<!-- Page 157 -->

3 Configuring Inventory Management
158
3.6    SAP Fiori
The SAP Fiori concept is based on user roles differentiating between apps, which means 
that the available apps for an end user are based on their business role assignment. The 
concept is mainly based on different entities:
▪Business role
▪Business catalog group
▪Business catalog
 
Further Resources
While setting up your catalogs according your needs, you can use the SAP Fiori launch-
pad content manager, which significantly simplifies the setup procedures. For a detailed 
description of the SAP Fiori launchpad content manager, refer to SAP Note 2772270.
In this section, we’ll unpack these entities, explore user roles, and walk through the SAP 
Fiori apps reference library.
3.6.1    SAP Fiori Entities
The relationship of the SAP Fiori entities is outlined in Figure 3.107. A business role con-
tains one or more business catalog groups. A business catalog group exists out of one or 
more business catalogs.
Figure 3.107  Business Role Concept
The business catalog group builds a cluster of apps that belong together semantically. 
In the SAP Fiori launchpad, these apps are combined also from a layout perspective, as 
shown in Figure 3.108.
In this Stock Monitoring business catalog group example, you can see that it contains 
three apps in the semantical area of stock analytical functions for monitoring stock fig-
ures.
Business Role
Business Catalog Group
Business Catalog Group
…
…
…
Business Catalog
Role
Business Catalog
Role
Business Catalog
Role
…


<!-- Page 158 -->

159
3.6 SAP Fiori
Figure 3.108  Business Catalog Group: Stock Monitoring
Below the level of business catalogs, the technical catalogs provide the required infor-
mation about the app itself (like target mapping).
The business role is focused on the business use case and processes an end user might 
face. Via the Maintain Business Roles app (F1492, role administrator; see Figure 3.109), 
you can create your own business roles and assign business catalogs if the predelivered 
business roles don’t meet your business needs.
Figure 3.109  SAP Fiori App: Maintain Business Role
With release 2025, SAP has migrated all SAP Fiori apps so that they have become sepa-
rate deployable entities (IAM Apps). Of course, they are still assigned to business catalog 
roles, but this assignment is no longer prerequisite for deployment.


<!-- Page 159 -->

3 Configuring Inventory Management
160
3.6.2    Roles and Users
We’ve seen that the SAP Fiori launchpad concept is role based. In the SAP S/4HANA 
standard delivery, role templates are included that serve as entry points for company-
specific role setup.
The following business roles are predelivered with the related business catalogs 
assigned in inventory management:
▪SAP_BR_INVENTORY_ANALYST
▪SAP_BR_INVENTORY_MANAGER
▪SAP_BR_WAREHOUSE_CLERK
In the course of the book, these three classic roles in inventory management will serve 
as a foundation as we introduce the different SAP Fiori apps in inventory management 
in SAP S/4HANA. Let’s first take a high-level look at them:
▪Inventory manager
The inventory manager is responsible for ensuring an uninterrupted inventory flow 
that creates an optimal stock situation. The inventory manager aims for a high 
throughput of materials after goods receipt and picking of orders to keep stock level 
and inventory costs low. Additionally, these tasks are performed with a low error 
rate. They’re responsible for implementation and documentation of quality stan-
dards and fulfillment of legal obligations (i.e., physical inventory). Their goals are met 
by steady observation of relevant inventory KPIs.
▪Warehouse clerk
The warehouse clerk ensures a high throughput of goods receipts and picking orders 
from an operational point of view. They also check deliveries for damages and com-
pleteness. These tasks are performed with a low error rate and are documented 
according to the given process framework (i.e., physical inventory counting). For 
their daily warehouse tasks, they make use of transactional apps to post and docu-
ment inventory processes in the system (i.e., Post Goods Receipt for Purchase Order 
app, F0843). In addition, they make use of open task check apps, such as Overdue 
Materials, to focus on the important issues.
▪Inventory analyst
The inventory analyst focuses on strategic inventory management by forecasting 
inventory KPIs and analytic accuracy. The inventory analyst aims to minimize over-
stocks, avoid scrapping, anticipate turnover for specific product groups, and ensure 
delivery capability from a strategic point of view. They require effective software that 
delivers real-time data to ensure that analytics are as accurate as possible. Observa-
tion of market trends and examination of new inventory trends are crucial to devel-
oping future inventory management in their company.
Some more special business roles are delivered that are mainly based on the generic 
ones mentioned previously.


<!-- Page 160 -->

161
3.6 SAP Fiori
SAP offers the launchpad content manager (see SAP Note 2772270) for customers on SAP 
Cloud ERP Private and on-premise, which can be reached via Transaction /UI2/FLPCM_
CONF for system-wide SAP Fiori launchpad configuration or Transaction /UI2/FLPCM_
CUST for client-specific SAP Fiori launchpad configuration. The launchpad content man-
ager (see Figure 3.110) allows you to create custom target mappings, custom roles, and 
custom space and pages.
Figure 3.110  Launchpad Content Manager: Cross Client
In the course of this book, we’ll touch on several apps that you also might want to test 
or make use of. The following lists a collection of related business roles and business cat-
alogs for your reference:
▪Quality technician (SAP_BR_QUALITY_TECHNICIAN)
▪Receiving specialist (SAP_BR_RECEIVING_SPECIALIST)
▪Inventory accountant (SAP_BR_INVENTORY_ACCOUNTANT)
▪Situation handling specialist (SAP_BR_BUSINESS_PROCESS_SPEC)
▪Predictive analytics specialist (SAP_BR_ANALYTICS_SPECIALIST)
▪Design engineer (SAP_BR_DESIGN_ENGINEER)
▪Production engineer (SAP_BR_PRODN_ENG_DISC)
▪Production planner (SAP_BR_PRODN_PLNR)
▪Production supervisor (SAP_BR_PRODN_SUPERVISOR_DISC)
▪Production operator (SAP_BR_PRODN_OPTR_DISC)
▪Production process specialist/compliance engineer (SAP_BR_PRODN_SUPRVSR_
DISC_EPO/SAP_BR_PRODN_SUPRVSR_DISC_CAM)


<!-- Page 161 -->

3 Configuring Inventory Management
162
 
Note
Because myriad business catalogs are assigned to the predelivered SAP business roles, 
we’ve just mentioned the relevant business roles for simplicity reasons in this book. If 
you just want to assign certain aspects of an SAP business role to your own user and 
business role, you can check out the assigned business catalogs of the SAP business roles 
and assign the business catalog accordingly.
3.6.3    SAP Fiori Apps Reference Library
The SAP Fiori apps reference library is a web-based tool that provides an overview about 
the available app in the different product versions. The library can be used in different 
stages of a project. You can get an overview to prepare decisions regarding which apps 
will be used, and during implementation, the library can provide you with a lot of useful 
information, such as the required OData services that must be activated to be used in a 
certain SAP Fiori app.
You can select the app of interest by using the navigation bar (or just filtering), as shown 
in Figure 3.111.
Figure 3.111  Selection of SAP Fiori Apps in SAP Fiori Apps Reference Library


<!-- Page 162 -->

163
3.6 SAP Fiori
Select an app and the related app information is displayed. In this example, Material 
Documents Overview (F1077) is selected, which opens the screen shown in Figure 3.112.
Figure 3.112  Header of SAP Fiori App in SAP Fiori Apps Reference Library
By selecting the delivery version in the dropdown box (SAP S/4HANA, in our example), 
the different deployment versions can be selected:
▪SAP S/4HANA
▪SAP S/4HANA Cloud
According to the selection of the delivery version, the SAP Fiori apps reference library
displays deployment-specific information.
The description of the PRODUCT FEATURES includes a screenshot and also a link to the 
related app documentation. You can also access the IMPLEMENTATION INFORMATION, 
which, as mentioned previously, contains important SAP notes to be implemented, for 
example. In the SAP S/4HANA Cloud delivery version, the related Scope Items are also 
listed here (see Chapter 9, Section 9.1.1).
Another piece of interesting information is outlined at the end of the product features: 
a list of other apps in the same area that might give insight into related apps.


<!-- Page 163 -->

3 Configuring Inventory Management
164
3.7    Summary
SAP S/4HANA provides a lot of configuration and setup capabilities to steer the inven-
tory management processes based on your requirements. The IMG allows you to config-
ure the organizational units and processes around inventory management. Functional 
cross-topics extend the core functions with additional features specific for certain indus-
tries. Generic cross-functions are services consumed by different apps, mainly support-
ing streamlining processes. Extensibility enables you to add additional custom fields to 
business apps and business processes.
With several technical deployment options of the UI layer (frontend), more flexibility 
is given with SAP S/4HANA. In addition, starting with the SAP Fiori launchpad is made 
easier by the provision of predefined business roles and business catalogs that may be 
the right entry point for you. On top of the configuration and enhanced user business 
role handling, SAP S/4HANA provides many communication interfaces for connecting 
your SAP S/4HANA core system to your related business environment.
 
Note
Chapter 9, Section 9.1.2 illustrates the implementation and configuration methodology 
for SAP S/4HANA Cloud Public Edition, which basically hides the intricacies and com-
plexity of the IMG and computes and deploys all settings described in this chapter based 
on the requested functional scope automatically.
After laying this foundation of information, we can now start to take a deeper look into 
the inventory management business areas and how they are reflected in SAP S/4HANA. 
We’ll start with planning and adjusting inventory in the next chapter.
