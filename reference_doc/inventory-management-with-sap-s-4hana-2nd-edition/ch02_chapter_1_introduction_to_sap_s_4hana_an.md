# Chapter 1 Introduction to SAP S/4HANA and


<!-- Page 20 -->

21
Chapter 1
Introduction to SAP S/4HANA and 
SAP Fiori
Let’s begin with the basics—what is SAP S/4HANA, what is SAP Fiori, and 
how does inventory management fit in? In this chapter, we’ll build up the 
foundations of inventory management in SAP S/4HANA.
When talking about IT systems, solution architecture, or business processes, we often 
face the situation that business analysts and end users use a different terminology 
than IT people, which leads to misunderstandings and confusion during implementa-
tion projects. This chapter will shed some light on the latest IT terms introduced with 
SAP S/4HANA in general and within inventory management in particular.
An IT system is supposed to collect, store, compute, and present information to its 
users. To separate these tasks a little bit, IT systems are constructed as layers, as shown 
in Figure 1.1.
Figure 1.1  Software Architecture of an ERP System
ABAP
SAP Fiori
SAP S/4HANA Architecture
Collect and
Store
Compute
Present
User Interface Layer
Application Layer
Database Layer
Task
Software
Architecture Term
SAP S/4HANA System
Web Browser
HTTP(S)
SAP HANA
Database
Frontend
Backend


<!-- Page 21 -->

1 Introduction to SAP S/4HANA and SAP Fiori
22
An enterprise resource planning (ERP) system is an IT system designed to collect, store, 
compute, and present all kinds of business information in support of end users doing 
their business. SAP S/4HANA is the next generation ERP system that evolves the tech-
nology of the database layer and the user interface (UI) layer.
This chapter will explain the evolution of the database layer by introducing in-memory 
databases and the new data model in inventory management. We’ll then explain the 
simplification of the application layer and conclude with a discussion of the changes to 
the UI layer by introducing SAP Fiori.
1.1    SAP HANA Database
Databases are used to collect and store information. They represent the memory of an 
ERP system. After reading this chapter, you’ll understand why the SAP HANA database 
is a quantum leap in database technology.
Let’s break down SAP HANA into three parts: basics, limitations, and benefits.
1.1.1    Basics
To motivate this rather technical chapter, let’s assume you’re a financial accountant 
transferring $1000 from account A holding $2000 to account B holding $1000. You 
have the following expectation for your ERP system behavior:
▪The ERP system will always display the correct figures of accounts A and B regardless 
of whether the system is in normal operation mode or there was a power failure, 
hardware defect, or technical upgrade. Either account A holds $2000 and B holds 
$1000 or vice versa. Neither account has $2000 during the transfer nor will both 
accounts have $1000.
▪If $1000 is withdrawn from account A, then the same sum of $1000 will appear in 
account B.
▪Your transfer of $1000 won’t affect any other posting in the system done by you or 
by any other users.
▪You can always rely on the result of the transfer after it’s executed and confirmed by 
the ERP system.
Your expectations are met by the implementation of the atomicity, consistency, isola-
tion, and durability (ACID) principle for transactions. ACID describes in technical terms 
the requirements of an ERP system designed to support the business process used in 
this example. The cornerstone of such an ERP system is the database, which provides 
these ACID capabilities to the application (refer to Figure 1.1).
The challenge to today’s database vendors is to provide these capabilities not just 
for one transaction at a time but for millions of concurrent transactions changing


<!-- Page 22 -->

23
1.1 SAP HANA Database
terabytes of data simultaneously. For a long time, database implementations have 
relied on file systems such as storage on hard disks, where the data itself is organized in 
tables, and each table consists of an arbitrary number of rows stored sequentially on the 
hard disk. In our example, each row of the account table may have a column represent-
ing the account identifier (A or B) and another column representing the amount in cur-
rency for each account. A row may also be denoted in database terminology as a record. 
To execute the $1000 transfer, the database would need to read both rows of the 
account table from the hard disk into main memory, subtract the $1000 from the value 
of row A’s $2000 amount column, add it to the value of row B’s $1000 amount column, 
and then write both changes simultaneously back to the hard disk while making sure 
that no other transaction has changed the values of account A or account B in between.
With SAP HANA, a new type of database implementation has been introduced. Due to 
the advances in hardware, notably main memory and processing power, the SAP HANA 
database doesn’t use the file system as memory anymore. It keeps all data in the main 
memory (a change log of every operation is written to the hard disk to recover the main 
memory in case of unexpected hardware outages). In addition, the SAP HANA database 
organizes the data in columns instead of rows; for our example, this results in a column 
account identifier with values A and B and a column account value with initial values 
$2000 and $1000. The row information (i.e., record) is preserved by the order of each 
column. In general, this organization of data is referred to as column store in opposite 
to the row store outlined earlier.
The column store provides two advantages:
▪As the database knows all the different values stored in one column all the time, the 
database can use compression algorithms to reduce the main memory consumption 
of a column. This is helpful if you have a limited number of discrete values per col-
umn. For example, a plant in SAP is identified by four alphanumeric characters. 
Therefore, in a row store, you would normally reserve 4 bytes, or 8 bytes on Unicode 
systems, per plant. However, as long as you don’t have more than 255 different plants 
per column, 1 byte is sufficient to represent all different plants if it’s linked to a sec-
ond table holding the true values of each plant. This is referred to as Data Dictionary 
(DDIC) compression. Later, in Section 1.2.1, you’ll see how DDIC compression signifi-
cantly reduces the memory footprint in inventory management.
▪Many database operations comprise calculation within one column (sum, minimum 
value, maximum value, etc.). This is straightforward within a column store, as all val-
ues of one column are accessible in main memory. In a classical row store, you need 
to read all rows from the hard disk, extract the value for each column, and do the 
computation.
The main disadvantage of a column store is the use of delete and insert operations of 
rows. Eventually, this requires a reordering of all columns linked to the database table. 
To overcome this disadvantage, SAP HANA executes delete and insert operations per


<!-- Page 23 -->

1 Introduction to SAP S/4HANA and SAP Fiori
24
column in a transient area of the main memory and merges these changes back to the 
column store from time to time.
Now that you’ve learned the basics of SAP HANA database with its in-memory column 
store of database tables, let’s take a closer look at its limitations and benefits.
1.1.2    In-Memory Database Limitations and Mitigation Strategies
Although Moore’s law about computer hardware evolution is still valid to some degree, 
it’s obvious that there are physical boundaries that limit the size and processing power 
of modern computer systems today. Of course, this limitation also applies to in-memory 
database instances such as SAP S/4HANA.
As outlined in Section 1.1.1, using a column store instead of a row store has clear advan-
tages regarding mathematical operations per column; however, when applications 
need to fetch row by row from the database, a row store will perform better.
With SAP S/4HANA, the limitations are minimized so that the benefits mentioned in 
Section 1.1.3 create a unique user experience superior to all available ERP systems so far.
Scale Up or Scale Out
With SAP S/4HANA, you can either increase the main memory/processing power of the 
ERP system if your business grows (scale up), or you can distribute the tables held in 
memory between several SAP HANA server instances (scale out). The latter strategy 
clusters database tables on SAP HANA server instances in a way that avoids cross SAP 
HANA instance queries. Thus, you distribute your database content between the main 
memory of several SAP HANA server instances to achieve optimal performance for 
your business processes.
Archiving
At some point, the bank statements of the earlier example become obsolete. You can 
keep a few of them to prove some critical transactions, but you’ll simply discard most 
of them.
This process is called archiving in SAP S/4HANA, as shown in Figure 1.2. Most of the data-
base tables, which held business-critical data, offer an archiving object that can be 
linked to an archiving system. Archiving objects ensure that business data is removed 
consistently from the active storage in the SAP HANA database and transferred to the 
archive object. SAP uses the term information lifecycle management (ILM) to describe 
the process. Like the preceding example, archiving can also mean deletion. You can 
schedule archiving runs based on certain conditions. Archiving removes records from 
the SAP S/4HANA system. If end users want to access the archived records, they need to 
use transactions that are specially enabled to access archived data because normal busi-
ness transactions don’t access archived data.


<!-- Page 24 -->

25
1.1 SAP HANA Database
Figure 1.2  Database Access and Archives
Prior to archiving, often data protection and privacy (DPP) regulations need to be 
applied, which often leads to anonymization, obfuscation, or masking of DPP-relevant 
data. The archiving run creates periodical records, which at least for the material docu-
ment table (table MATDOC) can be further condensed into a single record using a purge 
operation, which we’ll get to know in Section 1.2.2. The entire ILM process is shown in 
Figure 1.3. Thus, the business data is preserved in a consistent way but also compressed 
and removed from active storage (see our discussion of the Record Type field in Section 
1.2.1).
Figure 1.3  Information Lifecycle Management
Explicit Access by
Archive Explorer 
Database Tables
Archiving
Transparent Access
by CDS 
SAP S/4HANA
Database
Archive Object
(1–n Database Tables)
Purge
Today
Current year
Year n–2
Year  n–1
Year n–3
Year n–4
Year n–5
Year n–6
Data is not
changed
anymore
Data is not used in
critical processes
anymore
End of
purpose
End of retention and
destruction of personal data
Current Documents (always accessible)
Archived Documents (archiving system)
Document
Archiving
Periodical Records
DPP process 
Single
Record


<!-- Page 25 -->

1 Introduction to SAP S/4HANA and SAP Fiori
26
1.1.3    Database Benefits and Features
As explained in Section 1.1.1, the column store offers many options for fast and efficient 
mathematical operations on the values of one database column, which allows you to 
move application coding into the database and improve performance. Moreover, the 
core data services (CDS) and built-in SAP HANA libraries (as you’ll see in this section) 
offer a rich collection of mathematical functions significantly enhancing the available 
ABAP open SQL syntax. This feature is wildly used in performance-critical processes 
such as available-to-promise (ATP) and material requirements planning (MRP) (see 
Chapter 4).
Core Data Services
New database features are leveraged only if they are consumable by the application and 
integrate nondisruptively into the existing code base. Therefore, SAP S/4HANA comes 
along with the new CDS technology. In a nutshell, CDS views are enhancements of exist-
ing database views. Their main features are as follows:
▪CDS views support basic software architecture requirements because they can be 
stacked and designed in layers.
▪CDS views offer a tool-supported declarative design of database operations without 
the need to learn SQL.
▪CDS view syntax offers a rich set of data manipulation language (DML) commands.
▪CDS views can be annotated to indicate reusability. They offer different kinds of tech-
nically and semantically stable contracts (see Chapter 3).
▪CDS views that are publicly available follow stable naming conventions for views and 
attributes.
▪CDS views are used to model access to SAP business objects. Each business object rep-
resents one or many database tables, which form a strong business relationship (i.e., 
header – item), as explained later in Chapter 9, Section 9.1.
▪CDS views offer an extension concept so that you can easily extend business objects 
with your own fields.
▪CDS views may directly interact with native SAP HANA functions.
▪CDS views allow the direct execution of authorization checks when retrieving data 
from the database and natively support DPP requirements.
▪CDS views support text-index based search (Section 1.4.3).
▪CDS views natively support OData.
▪CDS views support analytical capabilities such as data extraction or data aggregation.
▪CDS views can be directly accessed by ABAP programs and are visible in the ABAP 
DDIC.
▪CDS views represent the signature of an ABAP RESTful application programming 
model object (see Chapter 9, Section 9.1).


<!-- Page 26 -->

27
1.1 SAP HANA Database
Libraries
The SAP HANA database includes several build functionalities that are frequently used 
in ERP systems:
▪Enterprise search
Sometimes called fuzzy search or TREX, this functionality retrieves the best match-
ing text strings out of a set of text data based on a ranked similarity index.
▪Predictive Analysis Library (PAL)
This functionality offers statistical and predictive analytical capabilities.
▪Graph engine
This feature allows processing of mathematical graphs within the database.
▪Geospatial engine
This feature allows processing of geospatial data within the database.
1.2    A New Data Model
In this section, you’ll learn about the improvements that are part of inventory manage-
ment in SAP S/4HANA and, to some extent, in financial accounting, because the mate-
rial ledger intersects with our main topic. The cornerstones of the improvement include 
the redesign of two core database tables, the elimination of redundant fields distributed 
among various database tables holding aggregated data, the clear separation of trans-
actional data and master data, and the nondisruptive integration of the revised data 
model into the existing code base.
1.2.1    Material Documents (Table MATDOC)
Inventory management is about tracking physical or logical movements of materials as 
part of your business processes, and it’s in the center of all business processes dealing 
with procurement, production, sales and distribution, physical inventory counting, 
warehouse management, and so on. The tracking is achieved by recording any material 
movement with a material document posting (table MATDOC).
We’ll walk through the material document components, as well as how the material 
document differs pre- and post-SAP S/4HANA, in the following sections.
Basics
A material document contains a material document header and one or many material 
document items. The material document header contains the following:
▪Material document number (key)
▪Material document year (key)
▪Posting date


<!-- Page 27 -->

1 Introduction to SAP S/4HANA and SAP Fiori
28
▪Document date
▪Additional administrative fields
There are many possible material document items, as follows:
▪Key fields
The Material Document Number is derived from number range objects. The used 
interval depends on the type of material document (see Chapter 3, Section 3.1.3). The 
Material Document Year is the calendar year of the posting.
▪Posting date/document date
The Posting Date determines when the posting becomes valid from a business per-
spective. The Document Date normally contains the creation date of the material doc-
ument. Posting of material documents is only allowed in the two active posting 
periods. After a posting period is closed, posting into this period is no longer possible. 
The active posting periods normally correspond to two successive calendar months. 
The Posting Date must not be mixed up with the Created At timestamp (referencing 
system time zone). The Created At timestamp records when a material document was 
created; the Posting Date records when it becomes valid from a business perspective.
▪Additional administrative fields
These fields contain information on the user, transaction, and so on of the material 
document.
In most cases, each item is related to the posting of one material. The business pro-
cess of the movement is defined by the movement type of the Material Document 
Item. In addition to the Material and the Movement Type, each Material Document 
Item contains the following:
– Document item number
– Quantities/quantity units
– Stock type
– Special stock type
– Special stock type identifier
– Organizational units
– Material supplementing data
– Links to direct predecessor or successor documents in the business process
– One link to the valuation of the material document item
– Fields used for specific industry processes
– Fields extended by customers (coding block, material item; examples are given in 
Chapter 3)
▪Quantities
Each material has a Base Unit of Measure and optional Alternative Units of Measure. 
The Quantities are always recorded in Base Unit of Measure and in the inputted unit 
of measure.


<!-- Page 28 -->

29
1.1 SAP HANA Database
▪Stock types, special stock types, special stock type indicator
A stock type is a logical attribute identifying the purpose, state, or usage of a defined 
quantity of material stock in SAP. There are 10 predefined stock types in inventory 
management in SAP S/4HANA, such as Unrestricted-Use Stock, Quality Inspection 
Stock, Blocked Stock, and so on (see Chapter 2, Section 2.1).
Moreover, stock types might be subdivided by the Special Stock Type indicator. 
Depending on the special stock type, additional special stock type indicators are 
required. Here are a few examples:
– Special stock type K (Supplier Consignment) requires the supplier number.
– Special stock type Q (Project Stock) requires the work breakdown structure (WBS) 
element to identify the assigned project.
– Special stock type E (Orders at Hand) requires the sales order item.
Stock types and special stock types help the system and end user determine whether 
a defined quantity of material stock is usable in a dedicated business process. Stock 
type changes are recorded with material documents containing the designated 
movement types. For transfer postings, both issuing and receiving stock types are 
recorded.
 
Note
The stock types discussed here are the inventory stock types. There are stock types in SAP 
S/4HANA that aren’t managed by inventory management and thus not recorded by 
material documents (e.g., nonvaluated goods receipt blocked stock).
▪Organizational units
To structure your business processes, you need to structure your organization (see 
Chapter 3). In core inventory management, typical organizational units are as follows:
– Plant
– Storage location
To valuate a material movement, the company code might be required (derived from 
the plant). For material transfer posting, the issuing and receiving organizational 
units are also recorded.
▪Material supplementing data
In some cases, the material number itself isn’t sufficient and needs to be enhanced 
with supplementary data. For example, if your material is subjected to batch man-
agement, the batch number is also part of the material document item (see Chapter 
3, Section 3.2.1).
▪Links to direct predecessor or successor documents in the business process
If your material document item is created as part of a business process, links to the 
direct predecessor or successor document items are stored.


<!-- Page 29 -->

1 Introduction to SAP S/4HANA and SAP Fiori
30
For example, if you create a goods receipt for a purchase order item, then the material 
document contains the appropriate movement type 101 and the purchase order item.
▪One link to the valuation of the material document item
Material documents only store the quantity-related information of material move-
ments. The financial impact of a material movement is stored in a different table 
(Section 1.2.3). The KALNR value in table MATDOC is the direct link between the material 
document item and the accounting document item representing the material valu-
ation related to the quantity posting in table MATDOC.
▪Fields used for specific industry processes
Some industry-specific processes fill additional fields during a material document 
posting.
▪Fields extended by customers (coding block, material document item)
Users can extend the material document item with custom specific fields to extend 
the SAP S/4HANA predelivered business processes. There are two business contexts 
available: coding block and material document item. For example, with the business 
context coding block, you can add custom specific fields in the goods receipt process 
to control the account determination of the involved financial document.
 
Note
In addition to the field group explained in the preceding list, table MATDOC contains some 
technical attributes that don’t have any influence on business processes and therefore 
aren’t mentioned here.
Material documents can’t be changed or updated (exception is the header text). If a 
material document item is incorrect, the material document item must be reversed by 
creating a reversal posting (another material document with at least one item repre-
senting the reversal). Normally, the movement type of the reversal posting is directly 
derived from the movement type of the material document item to be reversed. As a 
rule of thumb, movement types with odd numbers represent the normal business pro-
cess flow, and the movement type with the follow-up even number is the correspond-
ing reversal posting. In other words, reversal means the original material document is 
neutralized by an inverted material document.
Thus, material documents can be considered as journals recording all material move-
ments within an SAP S/4HANA instance. As the number of material documents may 
grow very quickly, an archiving strategy can be used to keep the size within reasonable 
bounds (Section 1.1.2).
As the material documents record all logical and physical stock changes, the inventory 
stock situation can be calculated at any given point by evaluating the appropriate mate-
rial document items.


<!-- Page 30 -->

31
1.1 SAP HANA Database
Pre-SAP S/4HANA Design
The SAP system on previous SAP releases (such as SAP ERP) recorded the material doc-
uments in two normalized database tables. One table stored all material document 
headers (table MKPF), and a second table stored the material document items (table 
MSEG). In addition, each material document posting updated several tables that stored 
aggregated information on the material stock in the system. Some of the tables con-
tained master data attributes and aggregated material stock data (e.g., tables MARD and 
MARC), whereas others contained exclusively aggregated material stock data (see Figure 
1.4).
Figure 1.4  Old Data Model versus the Simplified Data Model for Material Documents
The first tables are denoted as hybrid tables in Figure 1.4. During a material document 
posting, these tables were exclusively locked for a short time by the posting process to 
ensure data consistency. After closing the current posting period, the aggregated stock 
data was transferred to history tables, for example, MARDH and MARCH.
This design ensured the following:
▪All stock changes were recorded as material documents.
▪The actual stock quantity was stored per stock type in various tables.
▪All stock quantities were modeled as key figures.
▪Some preprocessed aggregates were available for analytical purposes.
▪The stock history was preserved for each posting period end.
MATDOC
SAP S/4HANA
SAP ERP
Material
Master Tables
MARC
MARD
MCHB
MKOL
MSKA
MSKU
MSLB
MSPR
MKPF
MSEG
Hybrid
History
Aggregate
Tables
MSSA
MSSQ
MSTB
MSTE
MSTQ
MSSAH
MSSQH
MSTBH
MSTEH
MSTQH
MARCH
MARDH
MCHBH
MKOLH
MSKAH
MSKUH
MSLBH
MSPRH
MARC
MARD
MCHB
MKOL
MSKA
Material Document Tables
Material Document Tables
Master Data + On-the-Fly Aggregation
Denormalized Material Documents
MSLB
MSPR
MSKU


<!-- Page 31 -->

1 Introduction to SAP S/4HANA and SAP Fiori
32
SAP S/4HANA Revised Data Model
As explained in the previous section, all stock changes are recorded as material docu-
ment items. Hence, the stock quantity at any given point could be calculated by sum-
ming up the relevant material document items. Based on this idea, a new denormalized 
database table MATDOC was designed, containing all required fields to calculate the quan-
tity of any stock type at any given time. The table’s design was optimized exactly for this 
purpose in the following ways:
▪A globally unique identifier (GUID) was introduced as an artificial key split up across 
several key fields to reduce memory.
▪Quantity fields with sign and suitable size were introduced to support fast aggrega-
tion.
▪Header and item were merged into one denormalized table to avoid join operations 
on the database table level.
▪A Record Type field was introduced to ensure the correct quantity calculation for data 
migration, corrections, and fast aggregation of transfer postings or data archiving.
▪Attributes serving as logical keys for all known stock types were grouped as stock 
identifying fields. More than 60 different inventory stock types are known in SAP 
S/4HANA. This approach is called the account model.
▪To support stock transfer posting, the appropriate logical issuing and receiving attri-
butes were included in the table definition as complementary stock identifying 
fields. That is to say, the table matdoc record always contains the stock identifying 
fields and, in case of a transfer posting, also the stock identifying fields of the source 
stock as complementary stock identifying fields.
▪To support fast document flow analysis of reversals, the reversal document and the 
reversed document were linked as a double-linked list.
▪Fields holding posting information, such as week, month, day of week, and so on, 
were introduced in addition to the posting date itself to support analytical queries.
Technically, a database table definition in the ABAP DDIC serves two purposes in SAP:
▪Defines a database table, which is created by the data definition language (DDL) on 
the database instance and is accessed by open SQL in ABAP
▪Defines a structure type, which can be referred to in any ABAP program
1.2.2    Precompacting and Purging Data (Tables MATDOC and MATDOC_EXTRACT)
Even for columnar store databases, some operations may take too long if a large number 
of single records must be aggregated. That’s why table MATDOC has a twin: table MATDOC_
EXTRACT. The twin contains basically the same data as table MATDOC, but aggregated on a 
posting period basis. Aggregation runs are included automatically in the period-end 
closing activities via Transaction MMPV, which ensures that there is no significant per-
formance degradation caused by large data volumes.


<!-- Page 32 -->

33
1.1 SAP HANA Database
The new data model outlined here must also ensure that the existing ABAP code still 
works correctly despite all the changes in table design and the new approach to calcu-
lating stock quantities solely out of table MATDOC records. In spite of replacing the func-
tional purpose of table MKPF and table MSEG, their technical definition (and therefore 
their structure type) is still visible in SAP S/4HANA. Their ABAP DDIC information has 
been enhanced by a replacement object (sometimes also called a proxy or compatibility 
view), which redirects any read access to table MATDOC and returns the data records in the 
correct format, as shown in Figure 1.5.
Figure 1.5  ABAP DDIC Replacement Object of Table MARC (Plant-Related Data of a Material 
Master Record)
This technique is used to eliminate other redundant aggregate tables or aggregates in 
master data tables so that eventually all material document or stock quantity informa-
tion in SAP S/4HANA is either calculated from table MATDOC or its twin, table MATDOC_
EXTRACT, depending on the required granularity (daily versus posting period) on request.
 
Further Resources
Details on the lifecycle of material documents are attached to SAP Note 3348245. SAP 
Note 2206980 helps you plan your upgrade to the revised data model in inventory man-
agement in SAP S/4HANA. SAP Note 2569435 describes how to deal with the content of 
the replaced tables after an upgrade to SAP S/4HANA.


<!-- Page 33 -->

1 Introduction to SAP S/4HANA and SAP Fiori
34
Of course, adding up thousands of records will always take more time than just reading 
a single preaggregated value. Therefore, all read access to the master data containing 
aggregates has been optimized in SAP S/4HANA so that the aggregation isn’t executed 
if the requesting coding merely needs the master data.
The new data model described so far has another advantage over the pre-SAP S/4HANA 
design. Because there is no need to update several aggregate tables, there is also no need 
to lock tables during material document posting. This insert only design facilitates 
throughput and greatly increases the performance of material document postings (see 
Figure 1.6). See Chapter 3, Section 3.1.3, for more details.
Figure 1.6  Comparison of Material Document Posting Performance
1.2.3    Accounting Documents (Table ACDOCA)
We’ve seen that table MATDOC only stores the quantity-related information of material 
movements. The value-related information is stored in another new table, table ACDOCA. 
The link between both tables is the attribute KALNR, which links every material docu-
ment posting to an accounting document posting. Figure 1.7 shows the redesign of the 
database tables involved in inventory valuation. Similar to table MATDOC, table ACDOCA
(called the Universal Journal) replaces the denormalized tables BKPF and BSEG. In addi-
tion, several aggregate tables have become obsolete. Table ACDOCA also has a twin, table 
ACDOCA_M_EXTRACT, which contains aggregated material ledger data created during 
archiving runs with the archiving object CO_ML_AEXT.
0
100
200
300
400
500
600
700
800
900
1
5
10
20
40
60
70
80
Simulated Backflush Posting with 100 Items per Material Document
SAP ERP
SAP S/4HANA
Parallel Processes
Throughput (Items/Sec)


<!-- Page 34 -->

35
1.3 Functional Changes
Figure 1.7  Old Data Model versus Simplified Data Model for Accounting Documents
1.3    Functional Changes
In this section, we’ll discuss the changes in the application layer of SAP S/4HANA, which 
include both the removal of redundant application functionality and the retrofitting of 
industry-specific coding into the normal code line to make it available to all customers 
via simple configuration.
1.3.1    Simplification List
SAP S/4HANA was crafted with the idea to eliminate redundant or obsolete functional-
ity. Historically, SAP has often tried to preserve functionality during release upgrades 
for backward compatibility reasons. Consequently, this has often led to the situation
in which functional equivalent applications coexisted within one system. With SAP 
S/4HANA, SAP has decided to follow a different approach by publishing a simplifica-
tion list, which contains functions and technology that have become obsolete and are 
removed during an upgrade to SAP S/4HANA.
 
Note
This simplification list is published for each major on-premise release at http://s-prs.co/
v489200.
With the help of this list, you can upgrade your implemented processes during the tech-
nical upgrade to SAP S/4HANA.
ACDOCA
SAP S/4HANA
SAP ERP
Valuation
Tables
MBEW
EBEW
OBEW
QBEW
CKMLCR
CKMLPP
BKPF
BSEG
MBEW
EBEW
CKMLPP
CKMLCR
MBEWH
EBEWH
OBEWH
QBEWH
OBEW
QBEW
Valuation
Tables
History
Material
Ledger Tables
Accounting Document Tables
Accounting Document Tables
Master Data + On-the-Fly Aggregation
Universal Journal Entry Line Items


<!-- Page 35 -->

1 Introduction to SAP S/4HANA and SAP Fiori
36
1.3.2    Industry Solution Retrofitting
SAP ERP's basic architecture was built on the business function concept, which allowed 
you to switch on industry-specific functionality or new developments shipped in 
enhancement packages. This architecture has allowed SAP to enrich its ERP flagship in 
a stepwise manner with additional features that only become active if the code is acti-
vated when the assigned business function is turned on.
In SAP S/4HANA, the vast majority of the switchable code fragments are merged back 
into the main code line and the business function is replaced by simple configuration. 
The following includes the most prominent retrofitted business functions:
▪Long material number (40 digits), which is natively supported in SAP S/4HANA
▪Catch weight management, which supports a parallel (second) unit of measure in all 
logistic transactions
▪Discrete industry and mill products
▪Retail (partially)
1.3.3    Clean Core
The clean core concept is an IT strategy to implement your SAP architecture in a way 
that any required extensions to business processes are done by using public extension 
techniques with well-described contracts in order to enable a loosely coupled release 
upgrade strategy. We’ll dive into those public extension techniques in Chapter 9.
1.4    SAP Fiori
Let’s now discuss the evolution of the UI layer in SAP S/4HANA. End users access an ERP 
system via its UI. The easier and the faster an end user can perform their tasks, the 
higher the business value of an ERP system. As part of SAP S/4HANA, SAP Fiori is the 
new UI paradigm designed to increase end user productivity. In this section, we’ll walk 
through SAP Fiori’s design principles, applications (apps), and launchpad.
1.4.1    A New User Paradigm
SAP Fiori is the new user experience that brings together core design principles with a 
focus on the end user. SAP Fiori apps follow five design principles:
▪Role-based
All SAP Fiori apps are designed for a specific use case. The essential part of the use 
case is the end user definition. The user’s tasks and responsibilities, pain points, and 
daily achievements are the main input to app design. Each SAP Fiori app must be 
assigned to at least one role before it’s implemented. Each role is a blueprint of a 
business role based on the best practices gained in more than 30 years of SAP ERP


<!-- Page 36 -->

37
1.4 SAP Fiori
development. It’s important to understand that each SAP Fiori app is tailored to its 
assigned roles.
Consider a few examples: If the role is to perform logistics postings within one ware-
house, the assigned SAP Fiori app won’t offer any cross-company postings. Instead, 
it will support bar code scanning on mobile devices and an easy-to-use UI. If the role 
is managing inventory for plants, the SAP Fiori app will offer all kinds of inventory 
postings, including a rich UI.
▪Coherent
Usability means understanding a UI intuitively without training just by recognizing 
similar and recurring patterns. The highest degree of usability is reached when a UI 
becomes self-explanatory. As a prerequisite, similar requirements must translate into 
similar UI patterns, hence enhancing the usability, which is defined as coherence. All 
SAP Fiori apps are based on the same design patterns to provide an identical user 
experience. End users familiar with one list app will be able to work with all list apps.
▪Responsive
All SAP Fiori apps will run on any device and directly react to what end users do at 
any time. For example, if the screen size shrinks, the font size in the table doesn’t 
shrink; instead, the columns are removed according to their priority.
▪Simple
SAP Fiori apps focus on the essential information to complete a specific task. If the 
task becomes more complex, a different SAP Fiori app is used. When managing a 
business object, the SAP Fiori apps can be classified according to a pyramid-like lay-
ering, as shown in Figure 1.8, with the simplest one on top displaying the business 
essentials, and the complex ones with comprehensive editing capabilities forming 
the bottom of the pyramid.
Figure 1.8  Pyramid Approach to Accessing the SAP S/4HANA System via SAP Fiori Apps
Former SAP GUI and Web Dynpro Apps
Launchpad and Search
Overview Page
Worklists and Approvals
Analytical Apps 
Native SAP Fiori
Transactional SAP Fiori Apps (<100% Scope)
Object Pages in Display Mode
Transformed SAP Fiori
Native SAP Fiori app
with full functionality
Native SAP Fiori app
with reduced functionality
Transformed SAP Fiori app
with full functionality


<!-- Page 37 -->

1 Introduction to SAP S/4HANA and SAP Fiori
38
▪Delightful
A good UI feels like talking to a good friend. It helps and supports end users so that 
they enjoy their work.
SAP Fiori apps not only support different end user roles but also different levels of con-
figuration and personalization.
When working with SAP Fiori apps, end users will see all the information needed to do 
their daily work. If anything is missing, it will be just one click away. The system supports 
end users by automating as many steps as possible. Each end user can adjust any SAP Fiori 
app to their personal preferences by different sorts of personalization, such as app set-
tings, selection and layout variants, personalized tiles, and personalized home pages.
Adaptation of SAP Fiori apps by administrators or key users ensures that all end users 
have a productive working environment tailored to their needs. Adaptations always 
affect all users of an SAP Fiori app (see Chapter 3, Section 3.3.5).
Theming and extension of SAP Fiori apps by developers creates a uniform working 
environment within a company as well as customer-specific fields linked to business 
objects and passed within processes.
1.4.2    SAP Fiori Applications
SAP Fiori apps may be classified according to the complexity, flexibility, and versatility 
they offer to end users. In SAP S/4HANA, there are typically two basic types of technical 
SAP Fiori app implementations: native and former SAP GUI transactions. We’ll explore 
both in the following sections.
Native SAP Fiori Applications
Native SAP Fiori apps are developed from scratch in SAP S/4HANA. They follow com-
mon floorplans:
▪Overview page
An overview page (see Figure 1.9) displays mainly analytical information on the high-
est aggregation level suitable for the end user.
Interaction is limited to navigation from the highly aggregated data to the SAP Fiori 
app showing less aggregated data, which is shown in an interactive chart card on the 
upper left-hand side and a list card on the lower right-hand side with your navigation 
target. Filtering the information is possible at the top of the screen.
▪Simple list
A simple list (see Figure 1.10) provides information in a list-based layout with filter 
options at the top and structured columns in a responsive table offering navigation 
inside or outside the original SAP Fiori apps, create/edit/delete row functions (if appli-
cable), sorting, grouping, and filtering. If navigation options are linked to a list item, 
an arrow icon is displayed to the right of the list item on which you can click to start 
navigation. Sometimes, simple list implementations offer a split column layout so


<!-- Page 38 -->

39
1.4 SAP Fiori
that they resemble a worklist. Simple lists may be based on an SAPUI5 grid table offer-
ing an Excel-like layout with horizontal scrolling or an SAPUI5 responsive table filling 
the horizontal space without any scrollbar based on priorities and column wrapping.
Figure 1.9  Overview Page Warehouse Clerk
Figure 1.10  Simple List Material Documents Overview (Grid Table)


<!-- Page 39 -->

1 Introduction to SAP S/4HANA and SAP Fiori
40
▪Analytical list/SAP Smart Business app/Web Dynpro grid
What all these floorplans have in common is that they provide information as lists 
and charts displaying dimensions and measures. Measures are aggregated/disaggre-
gated if dimensions are removed or added to the table/chart. Navigation inside or 
outside the original SAP Fiori apps, sorting, grouping, and filtering are supported. 
There are slight differences depending on the use case, as follows:
– The analytical list page (ALP) apps (see Figure 1.11) combine charts and tables for 
simple drilldown operations. The filter bar at the top of the screen allows you to 
restrict the initial result set depicted by the chart and is switchable to graphical 
mode. Here you can use chart elements to drill down on subsets to be displayed 
in the analytical table at the bottom.
Figure 1.11  Analytical List Page: Dead Stock Analysis
– SAP Smart Business apps offer threshold definitions to indicate the critical status 
of key performance indicators (KPIs) to be displayed on the end user’s home 
screen (see Figure 1.12). You can see the filter bar at the top of the screen, toggle the 
Show Mini Tiles option (which are also displayed in the SAP Fiori launchpad), and 
the analytical chart and table show the results (not shown).
– Web Dynpro grids are spreadsheet-like apps that allow the arbitrary pivoting of 
rows and columns. You can display the result set as chart (not shown) or table, as 
shown in Figure 1.13. The left-hand section lists the dimensions and measures that 
can populate the columns and rows.


<!-- Page 40 -->

41
1.4 SAP Fiori
Figure 1.12  SAP Smart Business Scrap Reason
Figure 1.13  Web Dynpro Grid: Goods Movement Analysis
▪Object page
An object page (see Figure 1.14) is the simplest approach to display a business object 
instance. It allows multilevel internal navigation to subobjects also displayed in an


<!-- Page 41 -->

1 Introduction to SAP S/4HANA and SAP Fiori
42
object page layout. Object pages can support create/edit/delete operations, if appli-
cable. Object pages are structured with a header, sections, and subsections; in this 
example, the sections include the form, table with item details, and a Process Flow
graphic.
Figure 1.14  Material Document Object Page
▪Worklist
A worklist (see Figure 1.15) displays a filtered list of object instances so that each 
instance’s details are displayed when selected. Worklists allow create/edit/delete 
operations on each instance.
▪Initial page
An initial page (see Figure 1.16) starts with an empty page that allows the selection of 
one object instance. After selection, processing of the object instance, including nav-
igation to detail pages, is possible. If applicable, actions are offered. Here, you can see 
the input field at the very top, the header containing the sections to display, and 
three sections: form, table with item details, and attachment service.


<!-- Page 42 -->

43
1.4 SAP Fiori
Figure 1.15  Worklist Application Material Coverage
Figure 1.16  Initial Page of Goods Receipt for Purchase Order


<!-- Page 43 -->

1 Introduction to SAP S/4HANA and SAP Fiori
44
Each of these floorplans is composed of recurring design elements containing sections 
with filter bars, lists, tables, charts, and form elements. As a default, they offer built-in 
personalization features to control layout and filter criteria.
 
Note
The variant management employed by filter bars is an especially useful tool to person-
alize, share, and standardize selection criteria in business processes. SAP ships pre-
defined variants, but you can also create your own private or public variants.
Native SAP Fiori apps use, in most cases, the OData protocol to exchange data between 
frontend (browser) and backend systems, except in the case of analytical apps. Because 
the OData protocol follows the Representational State Transfer (REST) paradigm, native 
SAP Fiori apps need to ensure continuity between consecutive end user interaction 
steps. The SAP S/4HANA architecture allows the implementation of native SAP Fiori 
apps in a stateless or stateful interaction mode. The interaction mode ensures if and 
how end users can preserve the input after disconnecting from the backend system 
before saving the input. In addition, the interaction mode defines what happens if con-
current accesses to the same business object instance occur.
A stateless SAP Fiori app doesn’t keep any internal state on the backend server. If the 
stateless app executes a change operation on a business object, which may lead to a con-
flict or inconsistency, different conflict resolution patterns may be applied (rejected, last 
wins, first wins, merge of conflicting data). If a stateless implemented SAP Fiori app is 
closed, or the communication to the backend is unexpectedly interrupted, all end-user 
input is lost, which has not been sent to the backend. Stateless SAP Fiori apps can be 
implemented using a draft option, which means the state is implemented as a transient 
draft of a business object and stored in a separate persistency in the backend. The draft 
instance of a business object must be converted into an active instance of the business 
object; for example, it must be activated or posted to become part of a business process. 
Depending on the use case, the draft instance might be edited simultaneously by differ-
ent end users or edited by one particular end user at the time. Closing the draft-enabled 
SAP Fiori app and reopening the draft instance any time later is possible. In case of a com-
munication failure, only the most recent end user input is lost. Because all draft 
instances are kept on the backend, conflicts due to concurrent accesses to one business 
object can be easily detected and displayed to the end user. We'll show an example of 
working with draft instances of a business object in Chapter 7, Section 7.1.3.
In some rare cases, SAP Fiori apps can be implemented as stateful, which means a ded-
icated session will be set up for each instance of a stateful SAP Fiori app. None of the SAP 
Fiori apps described in this book are stateful.


<!-- Page 44 -->

45
1.4 SAP Fiori
Transformed SAP GUI Transactions
If you’re upgrading from SAP ERP to SAP S/4HANA, you’ll recognize many SAP GUI 
transactions converted into SAP Fiori apps. These SAP GUI transactions were adjusted 
to the SAP Fiori layout and are part of the business roles. They support the SAP Fiori nav-
igation concept too (Section 1.4.3). In many cases, the bottom of the pyramid (refer to 
Figure 1.8) is formed by these kinds of SAP Fiori apps because their predecessors were 
often used to solve complex business requirements. SAP Fiori apps based on former 
SAP GUI transactions retained their interaction mode. In most cases, this is a session-
based interaction with a state, which is kept in the backend session and secured by dura-
ble locks as part of the session; therefore, concurrent access to the same business object 
is prevented by the locks. A typical example in inventory management is the SAP Fiori 
app Post Goods Movement, which is based on the former SAP GUI Transaction MIGO
(see Figure 1.17).
Figure 1.17  SAP Fiori App: Post Goods Movement
1.4.3    SAP Fiori Launchpad
A prerequisite to fulfill the promises made by the SAP Fiori design principles in Section 
1.4.1 is uniform access to the SAP S/4HANA system. This section introduces the SAP Fiori 
launchpad as the web-based single point of entry across technologies and platforms.


<!-- Page 45 -->

1 Introduction to SAP S/4HANA and SAP Fiori
46
 
Note
You can still access the SAP S/4HANA system with the SAP GUI client, but you can’t use 
any of the features described in this book. The Google Chrome browser was used to 
access the SAP Fiori launchpad in this book, but other browsers work as well. Most 
screenshots provided in this book are based on an SAP Fiori Quartz theme taken on a 
system with spaces and pages activated.
Overview
The SAP Fiori launchpad is started from a URL prompting you to authenticate yourself 
and choose the logon language, as shown in Figure 1.18.
Figure 1.18  SAP Fiori Launchpad Logon Screen
After logging on, you’ll be directed to your personal Home page, shown in Figure 1.20, 
unless you start the SAP Fiori launchpad via direct link to an SAP Fiori app. The Home page 
is rendered based on the business roles assigned to the user. The modern SAP Fiori 
launchpad is based on spaces and pages, which is the successor of home page groups. 
Figure 1.19 displays how the space and pages help to organize all tiles linked to the respec-
tive business role. A business role contains all authorizations to start a collection of SAP 
Fiori apps. A building block of the business role is the business catalog, which is a reusable 
entity to group SAP Fiori apps belonging to the same business context. Business roles are 
created by key users based on business role templates shipped in SAP S/4HANA. Typically, 
you’ll design business roles according to your requirements by copying an appropriate 
SAP template, editing the new business role by adding or removing SAP Fiori apps, and 
adding or removing authorizations used within the SAP Fiori apps (see Chapter 3). You


<!-- Page 46 -->

47
1.4 SAP Fiori
can assign multiple spaces to one user account each having multiple pages with multiple 
tiles. Sorting and designing the building blocks page and tile can be controlled by priori-
ties during design time (see Chapter 3, Section 3.6.2).
Figure 1.19  Inventory Management Space
Figure 1.20 shows the typical My Home layout when logging on as inventory manager. 
Let us shortly explain the group of icons in the top-right corner. From right to left, you 
can see the Me Area, the SAP Fiori launchpad notification, the SAP Companion, SAP Col-
laboration Manager, Joule (see Chapter 2, Section 2.3.4), and enterprise search. We’ll dis-
cuss these features in more detail later in this section.
You can personalize your My Home screen with the My Home Settings option in the 
upper-right corner, and with the controls in the upper left. The To-Dos section displays 
your tasks assigned to you by your My Inbox or by situation handling (see Chapter 3, 
Section 3.3.2). The News section can be configured to display SAP, system, or company 
news. You can configure the Pages section to quickly access your favorite pages. The 
Apps section helps you to quickly access your Favorite, your Most Used, your Recently 
Used, and your Recommended (by AI) apps. Add Apps helps you to configure the Apps
section. You can configure the Insights section by clicking Add Tiles to display business 
critical KPIs and monitor your daily work. We’ll refer to the Insights section in Chapter 8.
Section
App 1
App 2
App 5
Space A
Space A
SAP Fiori
Launchpad
Home
Page A1
Page A2
Business Catalog
Space
Page
Section Name
Section Name
Business Catalog
Business Role
Tile
App 3
App 4


<!-- Page 47 -->

1 Introduction to SAP S/4HANA and SAP Fiori
48
Figure 1.20  My Home for an Inventory Manager
Features
This section describes all the features embedded in the SAP Fiori launchpad using the 
My Home screen as a starting point. Let’s walk through each in the following sections.
Me Area
The Me Area, shown in Figure 1.21, can be accessed by clicking on the corresponding icon 
of the My Home page.


<!-- Page 48 -->

49
1.4 SAP Fiori
Figure 1.21  Me Area
The Me Area allows access to following key features:
▪Settings
You can update your user account information, language and region, default values, 
and more. You can only configure default values if they are supported by at least one 
SAP Fiori app of your assigned business roles.
▪Recent Activities/Frequently Used
If configured in your settings, the SAP Fiori launchpad tracks your recently and most 
frequently used SAP Fiori apps. You can start the corresponding SAP Fiori app out of 
this list.
▪My User Sessions
You can find the list of all sessions linked to your user.
▪App Finder
In the app finder, you can find an app in all business catalogs assigned to your user 
by your business role. Here, you can personalize your SAP Fiori Home page by pin-
ning relevant SAP Fiori apps and assigning them to groups.
▪About
This function helps you do identify the SAP Fiori ID of the app you’re currently using 
plus other technical settings such system version, device type, or theme.
▪Sign Out
Signing out by this function ensures that all credentials linked to your browser 
instance are cleared.
▪Keyboard Shortcuts
The menu item Keyboard Shortcuts becomes visible in the Me Area if an SAP Fiori 
app is open. When clicking on this menu item, a popup displays all available generic 
and custom keyboard shortcuts.
In addition to these features, apps or My Home-specific personalization may be placed 
in the Me Area (see our discussion later in this section).


<!-- Page 49 -->

1 Introduction to SAP S/4HANA and SAP Fiori
50
Search
You can access enterprise search in SAP S/4HANA directly via the search icon in the SAP 
Fiori launchpad.
Enterprise search is an unstructured (text) index-based search function used across 
business objects and their relationships in SAP S/4HANA. You can narrow the search by 
selecting a business object you want to search, as shown in Figure 1.22. You can also 
search for SAP Fiori apps.
Figure 1.22  Search and Business Objects
 
Example
If you want to search for a material document containing a material description of 
“Product A”, “Product a”, or “product A”, for example, you select Material Document as 
the entity and enter the search term as “Product A”. Enterprise search will return mate-
rial documents in a ranked list that match the search term—the better the match, the 
higher the rank.
The result of the search query and the navigation targets, shown in Figure 1.23, depend 
on the authorization of the end user after entering the search term. The results are dis-
played as a list, and the selected result list item appears with more details highlighting 
the search term (Trading). By using the filter criteria on the left-hand side, you can filter 
on the primary result set, based on attributes in the primary result set based on a tex-
tual or graphical filter.
Figure 1.23  Enterprise Search Results for Material Documents


<!-- Page 50 -->

51
1.4 SAP Fiori
The enterprise search in SAP Fiori launchpad is a generic search capability embedded in 
SAP S/4HANA to search for one or many business object instances and whether any 
object attributes are related to the search term. The closer the relation is, the higher the 
rank is in the result set.
Personalization
If you’ve started an SAP Fiori app that provides app-specific personalization capabilities, 
you’ll find an additional Application Settings entry in the Me Area, as shown in Figure 
1.24. The settings that appear here depend on the application.
Figure 1.24  SAP Fiori App Personalization
Notifications
Notifications offer a publish-subscribe mechanism within an SAP S/4HANA instance. If 
any change within a business process occurs, the app might publish a notification of a 
specific notification type. You can subscribe to notifications of a specific notification 
type in the Me Area. Newly arrived notifications will show up in the icon as a little num-
ber, and all notifications can be displayed by clicking on the icon, which will open the 
notification center (see Figure 1.25).
Figure 1.25  Notification Center


<!-- Page 51 -->

1 Introduction to SAP S/4HANA and SAP Fiori
52
Depending on the notification type, you can navigate to an appropriate SAP Fiori app 
to process the notification. Alternatively, you can directly dismiss the notification.
SAP Companion
The SAP Fiori launchpad includes an integrated help and support capability, which can 
be switched on or off by clicking the ? icon, as shown in Figure 1.26.
If you start another SAP Fiori app, the help menu automatically adjusts its content. The 
help menu contains short explanatory texts of the SAP Fiori app’s dedicated elements, 
which are marked by green bubbles and linked to the text.
In addition, the What’s this app? entry points to the external documentation of the SAP 
Fiori app and the four marked icons to the SAP Learning portal.
Figure 1.26  Integrated Help
SAP Collaboration Manager
The SAP Collaboration Manager is an embedded chat tool in the SAP Fiori launchpad, 
which allows users to exchange text messages. If you start your chat while on working 
in an SAP Fiori app, the context is automatically linked to the chat. Moreover, you can 
attach screenshots and documents or invite multiple users. Figure 1.27 shows a chat 
between two end users on the content of an attached document.


<!-- Page 52 -->

53
1.4 SAP Fiori
Figure 1.27  Chat Between User Inventory Manager and User Warehouse Clerk
Navigation
The SAP Fiori launchpad applies intent-based navigation. Any SAP Fiori app is started 
by calling its intent, which is composed of a semantical object and an action separated 
by a dash, for example, Material—DisplayStockOverview. In the SAP Fiori launchpad, 
the intent is part of the URL in the browser window.
Semantic objects normally identify business objects within SAP S/4HANA systems. 
Actions can be freely chosen when defining an SAP Fiori app in the SAP Fiori launchpad 
(see Chapter 3).
The intents can also be used to pass additional parameters when starting an SAP Fiori 
app. As the URL to the SAP Fiori app is stable, it can be bookmarked or shared. As long 
as the end user opening the URL has the authorizations to start the SAP Fiori apps, they 
will be able to start the SAP Fiori app directly.
This technique is also used if the end user shares SAP Fiori apps via the generic SAP Fiori 
launchpad capabilities Send E-mail, Save As Tile, Microsoft Teams, or Collaboration 
Manager, as shown in Figure 1.28. Many SAP Fiori apps not only support generic infor-
mation sharing but are also capable of sharing internal parameters, such as current field 
values or the current navigation state. Save as Tile allows you to add an instance of the 
currently used SAP Fiori app to any group in your SAP Fiori launchpad. Send E-Mail
opens your local e-mail client to send a link to the current SAP Fiori app, and Microsoft


<!-- Page 53 -->

1 Introduction to SAP S/4HANA and SAP Fiori
54
Teams or Collaboration Manager allow you to share information via a collaboration 
tool. The format (link, card, tab) depends on the system setup.
Figure 1.28  Generic Information Sharing Capabilities
In particular, the Save as Tile feature is a useful tool in personalizing the SAP Fiori 
launchpad; for example, you can add your own title, subtitle, and description to tiles 
and have them displayed in the Insights Tile section of the My Home screen (refer to 
Figure 1.20). When saving the tile, all filter and layout criteria are also persisted in case 
you have a list app. The tile on the SAP Fiori launchpad will show the actual number of 
list items matching the filter criteria (this is refreshed at regular intervals). You can cre-
ate your personalized tile group containing the most important key figures to look at 
using the My Home screen capabilities. To create an insight card on the My Home screen 
out of an overview page, as shown in Figure 1.29, you can choose the Add Card to Insights
option. The same feature is available in ALP applications (an example was shown previ-
ously in Figure 1.11).
Figure 1.29  Creating Insight Cards Out of an Overview Page
Another feature of intent-based navigation is the use of semantic objects to mark UI ele-
ments in the SAP Fiori app as a carrier of a semantic object key. In this case, the SAP Fiori 
launchpad automatically calculates which SAP Fiori apps are registered for the same 
semantic objects that belong to the end user’s business role and offers them as potential 
navigation targets (see Figure 1.30). The most prominent navigation option is automat-
ically to the object page of the business objects, if navigation is possible.


<!-- Page 54 -->

55
1.4 SAP Fiori
Figure 1.30  Semantic Annotation
The navigation targets can be personalized, and the key of the semantic objects is 
passed to the target SAP Fiori app when navigating.
Furthermore, some SAP Fiori apps may offer explicit navigation to other SAP Fiori apps 
if the targeted SAP Fiori app is part of the end user’s business role.
 
Note
It’s important to understand that navigating from SAP Fiori app A to SAP Fiori app B can 
mean that SAP Fiori app A is terminated, and SAP Fiori app B is initiated, unless SAP Fiori 
apps are kept alive in the background. When navigating back, the opposite process 
occurs; that is, the starting SAP Fiori app has to restore its state (former user input, lay-
out), if keep alive was not active.
Theming and Extensibility
SAP S/4HANA includes a theme designer that allows administrators to modify the 
themes shipped with SAP Fiori apps; for example, changing fonts, margins, and colors 
to create individual branding for your SAP Fiori apps.
 
Further Resources
Details on theming can be found in SAP Fiori: Implementation and Development by Sou-
vik Roy, Aleksandar Debelic, and Gairik Acharya (SAP PRESS, 2023).
SAP Fiori apps have built-in extensibility capabilities as well. The development envi-
ronment SAP Business Application Studio, hosted on SAP Business Technology Plat-
form (SAP BTP), supports you in creating custom SAP Fiori apps based on custom


<!-- Page 55 -->

1 Introduction to SAP S/4HANA and SAP Fiori
56
OData services. These custom SAP Fiori apps can be published in the SAP Fiori launch-
pad (see Figure 1.31).
Figure 1.31  SAP Business Application Studio
Many SAP Fiori apps have built-in field extensibility. Users can add new fields to be dis-
played or changed by the SAP Fiori app. You can permanently change the layout of 
existing SAP Fiori apps via runtime adaptation (RTA) tools, which we'll get to know in 
Chapter 3.
1.5    Summary
This chapter introduced the technical background of SAP S/4HANA. All three layers of 
the ERP software were discussed, including their key capabilities. The database layer is 
built on the new in-memory database SAP HANA using key features such as column 
stores of database tables, code pushdown, and a new API based on CDS. The app layer is 
optimized to work with SAP HANA. Redundant features collected in a simplification list 
were removed from SAP S/4HANA, and new developments such as denormalized tables 
MATDOC and ACDOCA were realized. The UI layer is implemented with the new concept of 
browser-based access to SAP S/4HANA, offering a role-based, coherent, and responsive 
collection of SAP Fiori apps that can be started within the SAP Fiori launchpad as a uni-
form UI environment with AI-enhanced capabilities (see Chapter 2, Section 2.3.4).
Leaving the technical details behind, the next chapter will start with the business topic 
of this book: inventory management.
