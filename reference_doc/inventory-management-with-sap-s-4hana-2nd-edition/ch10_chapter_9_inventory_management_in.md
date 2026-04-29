# Chapter 9 Inventory Management in


<!-- Page 430 -->

431
Chapter 9
Inventory Management in 
SAP Business Suite
In this chapter, we’ll turn to inventory management deployment and 
inventory management processes in SAP Business Suite. We’ll also dis-
cuss hybrid deployments and take a look at key cloud products.
So far, we’ve focused on inventory management with an SAP S/4HANA system. Now, 
we’ll switch gears to discuss your various deployment options and the overall SAP Busi-
ness Suite landscape for inventory, with a focus on cloud solutions. One possible option 
is a cloud deployment, which has the following features:
▪Code is owned by the vendor:
– Upgrades or patches applied centrally at defined points in time by the software 
vendor
– No access to code by the customer
▪System isn’t operated by the customer
▪System is preconfigured, and configuration is highly standardized
The transition of on-premise to cloud computing is sometimes fluent, and there isn’t a 
clear distinction. Consider the following metaphor: You move to another city and need 
somewhere to live. You have two options: buy your own house or rent an apartment.
In the moment you buy a property, you own it and can adapt it (within the technical 
and legal boundaries) to your personal needs. You’ll need to pay some auxiliary costs to 
keep the property in good shape from time to time. If you rent a property, your contract 
clearly defines your obligations and restrictions. Buying normally means a long-time 
engagement, capital investment, and stability, whereas renting gives you the flexibility 
to switch to a better-suited location if the boundary conditions change. You may want 
to enhance your house with new features such as a parking lot, solar heating, and so on. 
You can’t do this with a rented apartment.
A self-owned house strongly resembles an on-premise solution, whereas a rented apart-
ment is like a cloud solution.
Figure 9.1 explains the SAP S/4HANA deployment options. The dimensions used in the 
diagram are technology and business processes. Of course, you can exclusively opt for 
one deployment option only (see Figure 9.1, right-hand side). You can also choose to 
split your deployment along the technology or the business processes as a symmetric


<!-- Page 431 -->

9 Inventory Management in SAP Business Suite
432
hybrid model (upper row, left and middle column). Finally, you can choose an asym-
metric hybrid model (lower row, left and middle).
Figure 9.1  Deployment Options for Cloud and On-Premise
Before evaluating the details of a cloud solution and hybrid deployment scenario, we’ll 
have a look at the extensibility options already mentioned before, because they are an 
essential aspect of the technology axis in Figure 9.1.
9.1    Extensibility
Having a comprehensive understanding of the extensibility options is key to a successful 
inventory management implementation strategy. In the following sections, we’ll first 
provide an overview of extensiblity in SAP S/4HANA. Then, before we deep dive into con-
crete deployment options and implementation methodologies, we’ll explore where to 
look up all the artifacts SAP has released to be used in the various extensibility options: 
SAP Business Technology Platform (SAP BTP) and SAP Business Accelerator Hub.
9.1.1    SAP S/4HANA Extensibility
Figure 9.2 summarizes the extensibility options. On the left-hand side, an SAP S/4HANA 
system offers two types of on-stack extensibility:
▪Key-user extensibility is the process of enhancing SAP-delivered business objects (BO1, 
BO2) with customer fields (C1, C2) and custom logic (BADIy, BADIx). Moreover, process 
extensibility allows to pass selected custom fields from one business object to 
another. We have learned in Chapter 3, Section 3.3.5, how to implement custom fields 
and logic for various consumers (OData/SOAP APIs, UIs, form data providers, etc.).
Business Processes
Technology
On-Premise Deployment
Cloud Deployment
Business Processes
Technology
On-Premise
Deployment
Business Processes
Technology
On-Premise
Deployment
Cloud
Deployment
Business Processes
Technology
Cloud Deployment
Business Processes
Technology
On-Premise Deployment
Business Processes
Technology
On-Premise Deployment
Cloud
Deployment
Cloud Deployment


<!-- Page 432 -->

433
9.1 Extensibility
▪Developer extensibility (indicated by cBO and cConsumer) allows you to create your 
own business objects and their consuming applications (UIs, APIs, form data provid-
ers, etc.), which relate to SAP predelivered business objects. You can also use devel-
oper extensibility to extend the features of predelivered business objects with 
behaviour extensions (BHEz). Software logistics needed for developer extensibility in 
SAP S/4HANA Cloud Public Edition is explained in Section 9.2.2.
Side-by-side extensibility, on the right-hand side, is based on SAP BTP, which is ex-
plained in Section 9.1.2. You can link your SAP BTP implementation via SAP-provided or
customer-implemented APIs to your SAP S/4HANA instance (black horizontal arrows). 
Furthermore, you can implement custom business objects (cBOs) on SAP BTP and cus-
tom consumers (UIs, APIs, etc.). Needless to mention, partner solutions are based on the 
same extensiblity architecture.
In SAP S/4HANA Cloud Public Edition, developer extensiblity is enforced by the cloud 
environment, because you can only access/use business objects that are released by 
SAP. These released objects follow a defined contract and lifecycle. In private cloud/on-
premise, the clean core concept encourages you to follow the same implementation 
strategy to ensure release version independency and thus enable an easy and smooth 
upgrade of an SAP S/4HANA stack.
Figure 9.2  Overview of On-Stack and Side-by-Side Extensibility
When looking at Figure 9.2, you may ask yourself how all these business objects are 
implemented. The answer can be found in Figure 9.3. The ABAP RESTful application pro-
gramming model allows developers at SAP or customers to efficiently implement cloud-
SAP S/4HANA
SAP BTP
BO1
BO2
ConsumerA
ConsumerB
C1
C1
C1
Process Extensibility
C2
C2
cBO
cConsumer
C2
cBO
cConsumer
C2
cBO
cConsumer
cConsumer
C2
BHEz
BADIy
BADIx


<!-- Page 433 -->

9 Inventory Management in SAP Business Suite
434
ready transactional business objects for various consumers like UIs, services, or other 
business objects. The non-ABAP equivalent is the SAP Cloud Application Programming 
Model on SAP BTP. The ABAP RESTful application programming model business object 
implementations are never directly exposed for consumption, but their projection(s) 
of a business object containing a selected set of attributes, operations, and features are 
always exposed. The key element to model an ABAP RESTful application programming 
model object and eventually declare an object-relational mapping to one or more data-
base tables are core data services (CDS) views, already introduced in Chapter 1, Section 
1.1.3. ABAP RESTful application programming model business objects can be built on top 
of other business objects by utilizing their projections. Figure 9.3 summarizes the fea-
tures that come along with the ABAP RESTful application programming model.
 
Further Resources
If you'd like to have more insights into ABAP RESTful application programming model 
development and the respective development IDE, we recommend ABAP RESTful Appli-
cation Programming Model by Lutz Baumbusch, Matthias Jäger, and Michael Lensch 
(SAP PRESS, 2025).
Figure 9.3  ABAP RESTful Application Programming Model Object and Its Exposure via 
Projections
Database
Tables
Operations
Access
Control
Persistency
Management
EML
Draft
Locking
LUW
Handling
Public ABAP RESTful Application Programming Model Projection Layer
(To Be Consumed)
Private ABAP RESTful Application Programming Model Core Layer
(To Be Hidden)
Field and
Behavior
Extensibility
Node
Modeling
Metadata
Annotations
Change
Documents
Contract
Checks
Naming
Conventions
Object
Relational
Mapping


<!-- Page 434 -->

435
9.1 Extensibility
9.1.2    SAP Business Technology Platform
SAP BTP is an open business platform offering a design and runtime environment to 
create business applications. There is an entire set of available capabilities, such as an 
integrated development environment for rich internet applications; machine learning 
APIs; mobile services; Internet of Things (IoT) services; and integration, collaboration, 
and analytic services.
SAP BTP is ideally suited to extend existing or create new SAP Fiori apps in a side-by-
side scenario to collect and process IoT data, integrate data from various sources, and 
leverage machine learning capabilities.
 
Further Resources
If you like to get more information on SAP BTP, we would recommend SAP Business Tech-
nology Platform by Smitha Banda, Shibaji Chandra, and Chun Aun Gooi (SAP PRESS, 2024).
9.1.3    SAP Business Accelerator Hub
SAP Business Accelerator Hub is the central application programming interface (API)
repository of all SAP solutions, such as SAP S/4HANA, SAP S/4HANA Cloud, SAP Cus-
tomer Experience, SAP BTP, SAP SuccessFactors, SAP Fieldglass, SAP Concur, and SAP 
Ariba. APIs available in the SAP S/4HANA solution can be found at http://api.sap.com, 
as shown in Figure 9.4.
Figure 9.4  Entry Page of SAP Business Accelerator Hub


<!-- Page 435 -->

9 Inventory Management in SAP Business Suite
436
 
Note
As a rule of thumb, SAP S/4HANA Cloud Public Edition has two releases per year, and SAP 
S/4HANA Cloud Private Edition has one release every two years.
Business Application Programming Interfaces
When entering the SAP S/4HANA Cloud Public Edition section, you see the option to 
search for selected APIs, extensibility, or integration patterns (see Figure 9.5).
Figure 9.5  Entry Screen into Public Cloud Section
Figure 9.6 shows the entry screen to SAP S/4HANA Cloud APIs after searching for the 
term Material Document, which are typically used in side-by-side extensibility. The 
Details section here provides news, secondary documentation, and links. The most 
important feature is the search capability, which helps you quickly find your desired 
API. Each API is linked to an SAP S/4HANA business object type.
Using the OData protocol to access SAP S/4HANA business objects synchronously and 
using SOAP for process (asynchronous) integration is recommended. In this case, using 
the OData V4 APIs makes sense, because OData V4 contains some improvements to 
operations and performance in comparison with OData V2. In other cases where an API 
is no longer used, the Deprecated status is displayed (in contrast to Active). If an API 
must be changed in an incompatible way, SAP will deliver a new version and deprecate 
the existing version. The current version is always displayed. The deprecation mecha-
nism allows all customers to adopt to a new API version until the final API decommis-
sioning happens.


<!-- Page 436 -->

437
9.1 Extensibility
Figure 9.6  Search and Display of Results of SAP S/4HANA Cloud Business APIs
You can expect to find at least one OData-based API per SAP S/4HANA business object 
type, which can be used to read the SAP S/4HANA business object and perform create, 
update, or delete OData operations, if applicable.
The Details section of the Material Documents OData V2 API in Figure 9.7 contains some 
technical information; implementation hints, such as Scope Items and Communication 
Scenario; and most notably, a Documents section that contains links to supplementary 
information, such as blogs, links and hints.
Figure 9.7  Example OData V2 API Description


<!-- Page 437 -->

9 Inventory Management in SAP Business Suite
438
When opening an API Reference, you’ll be directed to a dedicated API overview page 
with entity types and supported operations including Try out on a reference system. 
The API Consumption section contains code snippets generators in various program-
ming languages for rapid prototyping.
 
Note
In general, the APIs published with SAP S/4HANA Cloud are also available in on-premise 
SAP S/4HANA; however, the API version and the API availability might differ.
Business Events
In addition to the OData and SOAP APIs, SAP Business Accelerator Hub also offers SAP 
S/4HANA Cloud business events, which can be used for a loose coupling between het-
erogenous systems.
Business events follow a publish-subscribe pattern, outlined in Figure 9.8. A consumer 
interested in changes of business objects in a different system instance subscribes to 
the corresponding event. When the event is triggered, the consumer gets notified.
Figure 9.8  Publish-Subscribe Example between SAP S/4HANA Cloud and SAP BTP
On-Stack Extensibility
We’ll get to know all kinds of artifacts released for on-stack extensibility with the help 
of the example Material Document. Let’s start with a simple read API. If you’re looking 
for released read APIs, you’ll find them under the CDS Views section, as shown in Figure 
9.9. You may remember the central role of CDS views in SAP S/4HANA has already been 
mentioned in Chapter 1, Section 1.1.3.
SAP BTP
SAP S/4HANA Cloud
Event
Subscription
Consumer
Event
Subscription
Consumer
Event
Subscription
Consumer


<!-- Page 438 -->

439
9.1 Extensibility
Figure 9.9  Search Results CDS Views for On Stack Extensibility: Material Document
In case you would like to perform more than read operations on the business object
(analog to BO1 or BO2, shown previously in Figure 9.2) or extend its behavior (BHEz in 
Figure 9.2), you can search for Business Object Interfaces (ABAP RESTful application pro-
gramming model business object projections released for public consumption) like in 
Figure 9.10.
Figure 9.10  Search Results Business Object Interfaces Material Document


<!-- Page 439 -->

9 Inventory Management in SAP Business Suite
440
The details of a business object interface contain General Information, Release State,
and available operations and business object nodes, as shown in Figure 9.11.
Figure 9.11  Example Material Document Interface BDEF
If you'd like to alter the business logic (refer back to BADIx or BADIy in Figure 9.2), you 
can search for Business Add-Ins, as shown in Figure 9.12.
Figure 9.12  Example Business Add-Ins Material Document


<!-- Page 440 -->

441
9.1 Extensibility
Each business add-in (BAdI) is described in detail, as shown in Figure 9.13. In particular, 
its signature and its impact on the business logic (location between the consumer and 
the business object in Figure 9.2) are explained.
Figure 9.13  BAdI Example to Implement a Custom Check Logic Before Posting a 
Material Document
9.2    SAP S/4HANA Cloud
This section introduces the SAP S/4HANA Cloud solution. All cloud criteria mentioned 
previously also apply for SAP S/4HANA Cloud. When you watch SAP S/4HANA Cloud 
demos for the first time, you’ll notice a strong similarity to the SAP S/4HANA solution. 
Indeed, SAP S/4HANA Cloud Public Edition is a prepackaged, scoping-enabled, SAP-
managed cloud solution based on SAP S/4HANA with a half year upgrade cycle. SAP
S/4HANA Cloud Private Edition has a two-year upgrade cycle with the offering of fea-
ture packs in between and shares the code base with the on-premise edition. Since 2023, 
public cloud and private cloud deployment options no longer share an identical code 
base. Due to the faster innovation cycle, SAP S/4HANA Cloud Public Edition supports 
cutting-edge technology, such as AI capabilities and SAP Business Data Cloud.
We’ll begin with a look at the SAP S/4HANA Cloud scope, before moving on to the imple-
mentation methodology, configuration, and update cycle.


<!-- Page 441 -->

9 Inventory Management in SAP Business Suite
442
9.2.1    Solution Scope
The SAP S/4HANA Cloud solution scope is enhanced either by continuous feature deliv-
ery or twice a year by a large upgrade. There is a dedicated change management follow-
ing the paradigms:
▪Any new feature shall be an opt-in for the customer or is hidden behind a feature tog-
gle.
▪If inevitable, any functional change, which may be perceived as incompatible, is 
announced upfront.
▪Deprecation of scope items, applications, or APIs follow a previously announced 
timeframe with dedicated phases.
The central entry point to explore the scope is SAP for Me (me.sap.com). The solution 
processes (previously known as scope items) are structured in a hierarchy as displayed 
by SAP Signavio Process Navigator in Figure 9.14. Here, we’ve navigated to the Solution 
Processes tab and selected Supply Chain • Inventory to view the 36 available solution 
processes for inventory management.
Figure 9.14  Solution Processes Linked to Inventory
Often the 3-character alphanumeric key is used (for example, BMC) in addition to a 
description (Core Inventory Management), as shown in Figure 9.15. Each solution pro-
cess comes with key information: Version, Accelerators, Country/Region and Industry 
Relevance, graphical Solution Process Flow, licensing information, and Solution Capa-
bilities.


<!-- Page 442 -->

443
9.1 Extensibility
Figure 9.15  Solution Process Core Inventory Management (BMC) with Solution Process Flow
The Accelerators tab, shown in Figure 9.16, contains documents to support the imple-
mentation process, such as test scripts referring to predelivered demo content or tuto-
rials.
Figure 9.16  Implementation Support by Accelerators
Another accelerator is linked via the End-User Information button in Figure 9.16 and 
lists training content available for end user training, as shown in Figure 9.17.


<!-- Page 443 -->

9 Inventory Management in SAP Business Suite
444
Figure 9.17  Tutorial Linked to a Solution Process
Figure 9.18 shows how the Industry Relevance and Solution Capabilities tabs, similar to 
the Country/Region Relevance tab, help you select the most suitable solution process(es) 
for an implementation project.
Figure 9.18  Linking a Solution Process to Industry Relevance and Solution Capabilities
 
Further Resources
If you want to try out the SAP S/4HANA Cloud offering, check out the SAP S/4HANA 
Cloud Trial offering at http://s-prs.co/v489205.


<!-- Page 444 -->

445
9.1 Extensibility
 
Note
In addition to the documentation and tutorials published in the SAP Signavio Process 
Navigator, SAP S/4HANA Cloud customers can sign up to the SAP Learning Hub and join 
the SAP S/4HANA Cloud implementation learning room, which contains a rich set of fea-
tured online tutorials, documents, blogs, and opportunities to connect with other SAP 
S/4HANA Cloud customers.
9.2.2    Implementation Methodology
When customers begin an SAP S/4HANA Cloud implementation, they follow dedicated 
phases and tools. The implementation methodology SAP Activate is based on the tools 
SAP Cloud ALM and SAP Central Business Configuration. Within each phase, steps, check-
points, and deliverables are defined. Let’s walk through the key phases, as shown in 
Figure 9.19:
1. Discover
During the discover phase, customers explore the solution capabilities of various 
SAP solutions based on their needs.
2. Prepare
The prepare phase is used to draft an initial project plan, onboard all team members, 
and define role and responsibilities.
3. Explore
During the explore phase, customers have the opportunity to test SAP S/4HANA 
Cloud on a starter system instance (see Figure 9.19). A starter system contains SAP 
Best Practices content and demo data, which allows customers to test and fine-tune 
the deployed process according to the provided test scripts mentioned in Section 
9.2.1. All configuration changes are local, which means they can’t be used in any 
implementation phases later.
At the end of the explore phase, customers receive a three-system landscape starting 
with a development system (D-system). During the setup of the D-system, initial 
scoping and the creation of the organizational structures are performed with SAP 
Central Business Configuration.
4. Realize
After setup, fine-tuning (Section 9.2.3) of the configuration is used to adapt the pre-
defined scope to the customer requirements in the realize phase. The result is trans-
ferred to the test system (T-system) and finally to the production system (P-system) 
so that both system configurations are kept in sync.
5. Deploy
At the end of the deploy phase, the P-system configuration is finished and ready for 
go-live. The last cycle (realize, deploy, run) may be repeated several times to apply a 
stepwise implementation of processes or countries.


<!-- Page 445 -->

9 Inventory Management in SAP Business Suite
446
Figure 9.19  SAP S/4HANA Cloud Implementation Phases
The three-system landscape setup offers an enhancement to the implementation pro-
cess by setting up a project line (PL) in addition to the main line (ML). The basic setup of 
an SAP S/4HANA Cloud system landscape contains a main line (represented by dedi-
cated SAP S/4HANA clients) in all D-, T-, P-systems with an associated workspace in SAP 
Central Business Configuration, which is used to manage business configuration. Fur-
thermore, there is an extensibility development client in the D-system used for on-
stack extensibility (Section 9.1.1). All scope-related (solution processes), country-related, 
and organizational setup is done in SAP Central Business Configuration based on the 
predelivered business configuration (Section 9.2.1) and then deployed to the ML of the 
D-system. In addition, you can use self-service configuration UIs (SSCUIs) to finetune 
the preconfigured business configuration (Section 9.2.3). The business configuration 
distribution by the transportation management system (TMS) from D- to T- to P-systems 
along the ML is managed by the customer.
In an advanced setup, you can choose at any point in time to branch (or copy) your ML's 
configuration into a PL. Branching is automatically executed in SAP Central Business 
Configuration and on the D- and the T-system, as shown in the upper part of Figure 9.20. 
After branching, any configuration changes are automatically recorded in the associ-
ated SAP Central Business Configuration workspaces (back sync). If you’d like to update 
your PL to the latest configuration changes done in the ML, you would execute a rebase 
operation. If you’d like to incorporate your configuration changes in the PL into the ML 
(and thus eventually into the P-system), you would need to execute a merge operation. 
You can discard your PL at any point in time and start the process again by a branch.
The advantage of using a PL during implementation projects is improved business con-
figuration change management, because you keep your ML “clean” for patches and sud-
den configuration change requests while working on planned scope, country, and 
Discover
Prepare
Explore
Realize
Deploy
Run
Phases
Configuration
P-System
Configuration
SAP Central Business
Configuration/D-System
T-System
Starter System
SAP Best Practices
Content


<!-- Page 446 -->

447
9.1 Extensibility
organizational setup enhancements. In addition, you can use your PL as a test or train-
ing environment.
Figure 9.20  Three-System Landscape with Software Logistics by TMS and ML (Client 100), 
Extensibility (Client 080), and PL (Client 120)
 
Further Resources
If you’re interested in more details on the SAP Activate methodology, we recommend 
SAP Activate: Project Management for SAP S/4HANA Cloud and SAP S/4HANA by Sven 
Denecken, Jan Musil, and Srivatsan Santhanam (SAP PRESS, 2025).
 
Note
In the past, cloud systems had only a two-system landscape and used the Manage Your 
Solution app (F1241) to access fine-tuning or create organizational entities (next sec-
tion). Because three-system landscape systems are the target architecture, and the con-
version of all two-system landscapes to three-system landscapes is being carried out 
currently, we’ll focus on three-system landscapes only.
9.2.3    Configuration and Fine-Tuning
Most of the configuration is carried out on the D-system and transferred to the T- and 
P-system in a consistent state. There are some rare exceptions when configurations 
can’t be transferred but have to be repeated on the T- and P-systems as well. One exam-
ple is the configuration of external system access.
SAP Central Business
Configuration
PL
ML
TMS
TMS
TMS
T-System
P-System
D-System
ML
ML
PL
Extensibility
Workspace
ML 
Merge
Branch and
Rebase
Workspace
PL 
Back Sync
Back Sync


<!-- Page 447 -->

9 Inventory Management in SAP Business Suite
448
The clear majority of all business process fine-tuning is performed by launching SSCUIs 
from SAP Central Business Configuration or from the Implementation Activities app
(SIMG), which is unique to SAP S/4HANA Cloud. Figure 9.21 shows the entry screen when 
logging onto an SAP Central Business Configuration system in the Implementation
phase, and it’s showing us the status of various activities. We’ll navigate with the menu 
on the left-hand side to the next step, Scope.
Figure 9.21  SAP Central Business Configuration Home Screen in Implementation Phase
The Scope section, as shown in Figure 9.22, is filtered for the already selected scope and 
displays the subset of scoped solution processes in Supply Chain (Section 9.2.1). To add 
an additional scope, you would start a change project in SAP Central Business Configu-
ration and select additional solution processes. SAP Central Business Configuration will 
ensure that all scope dependencies are resolved.
Figure 9.22  My Selected Scope: Subset Supply Chain


<!-- Page 448 -->

449
9.1 Extensibility
The next stop for supply chain-related configuration is the Organizational Structure
page, displayed in Figure 9.23, which shows the organizational entities modeled in SAP 
Central Business Configuration. To add additional organizational entities, you would 
need to start a change project in SAP Central Business Configuration by switching to 
edit mode, adding your organizational entities, and confirming the setup.
Figure 9.23  Set Up Organizational Structure: Graphical View of Confirmed Entities
Figure 9.24 shows the Configuration page, where you can finetune the predelivered solu-
tion process out of SAP Central Business Configuration. All SSCUIs in scope are listed, 
with a Status, Go-Live Relevance, Documentation, unique ID, and a Short Description.
Figure 9.24  Configure Your Business Process: SSCUIs That Are Part of Core Inventory


<!-- Page 449 -->

9 Inventory Management in SAP Business Suite
450
When clicking the SSCUI link, the SSCUI opens up and allows you to execute additional 
configuration, as shown in Figure 9.25. You can create additional reason codes or change 
the text of an existing one. The predelivered content is displayed and any changes made 
by an SSCUI will be directly recorded in the D-system (Section 9.2.2). Note that in the 
cloud, SAP may protect dedicated predelivered content against certain changes.
In addition, there is a namespace concept (see SAP Note 2326112) in place, which allows 
you to distinguish SAP-owned entries from customer entries. In general, SAP Central 
Business Configuration ensures that customer-created changes will always prevail over 
predelivered content.
Figure 9.25  SSCUI Reason for Movement (SSCUI ID 101091) with Predelivered Entries of 
Solution Process BMC
You may have noticed a strong similarity between the organizational setup and SSCUIs 
in SAP Central Business Configuration and the IMG activities presented in Chapter 3. In 
fact, they have very much in common. The advantage of the organizational setup in SAP 
Central Business Configuration is that it uses predefined templates of organizational 
entities to calculate and populate many configuration activities automatically. Although 
SSCUIs and IMG activities are built on the same underlying technology, the advantage of 
SSCUIs is that they:
▪Are scope dependent
▪Often come with predelivered entries
▪Offer a namespace protection


<!-- Page 450 -->

451
9.1 Extensibility
▪Contain additional consistency and integrity checks for business configuration
▪Are supported by the organizational structure set up in SAP Central Business Config-
uration
▪Are structured according to business capabilities
▪Support parallel implementation projects via SAP Central Business Configuration 
connection
9.2.4    Update Cycle
As explained in Section 9.2.1, SAP S/4HANA Cloud Public Edition deployments will be 
upgraded twice a year at a predefined date to the next edition. The upgrade cycle starts 
with the T-system upgrade, which is followed by the D-system upgrade. Two weeks after 
the D-system upgrade, the P-system is upgraded, as shown in Figure 9.26.
Figure 9.26  Upgrade Cycle in the Public Cloud
After the D-system upgrade, SAP S/4HANA Cloud Public Edition customers have two 
weeks to explore the features of the next edition, and then the P-system is upgraded. 
The whole cycle starts again after six months. A new scope must be activated explicitly 
by the customer after each upgrade. Any enhancements to the activated scope won’t 
interfere with any business processes of the customer.
2 Weeks
2 Weeks
D-System
Upgrade
P-System
Upgrade
T-System
Upgrade
20 Weeks


<!-- Page 451 -->

9 Inventory Management in SAP Business Suite
452
9.3    Hybrid Deployment
Now that we’ve introduced the cloud deployment model and we met SAP S/4HANA 
Cloud Public Edition as one representative, let’s look at whether you can combine cloud 
and on-premise and distribute the business processes between them. We’ll look at key 
hybrid scenarios in the following sections.
9.3.1    SAP S/4HANA and SAP S/4HANA Cloud
Today’s economy creates extraordinary challenges for IT. Business processes are rap-
idly changing. Companies invent new business models while discarding old ones. The 
process is often accelerated by mergers and acquisitions. Moreover, the internal supply 
chain plus all digital processes extended to suppliers and customers are constantly opti-
mized, often creating collaborative planning, forecasting, and replenishment scenarios, 
relying on emerging technologies such as IoT, AI, or blockchain. This phenomenon is 
often referred to as the digital transformation. IT’s challenge is to support this transfor-
mation while not disturbing the enterprise core processes. One approach to supporting 
new scenarios is by defining IT environments whose components evolve at different 
speeds:
▪The core component implements all business processes that are stable or evolving 
at a lower speed.
▪The agile component implements the rapidly evolving business processes depend-
ing on the latest technology or recent process innovations.
This approach is sometimes referred to as bimodal IT or two-speed IT. Both components 
must be linked to ensure consistency, which can become a nightmare if there is no 
semantic compatibility of business objects between both environments. SAP S/4HANA 
offers an easy-to-use solution to that challenge called two-tier ERP. Figure 9.27 displays 
four typical solution patterns consisting of an SAP S/4HANA solution and SAP S/4HANA 
Cloud instances:
▪Pattern 1 delineates a headquarter on-premise and its subsidiaries on the cloud.
▪Pattern 2 depicts a similar setup for corporate and affiliate.
▪Pattern 3 depicts how central services can be implemented in a cloud serving other 
on-premise and cloud instances.
▪Pattern 4 illustrates an ecosystem with the on-premise instance in the center and 
subcontractors, dealers, and so on as connected cloud instances.
As SAP S/4HANA and SAP S/4HANA Cloud have the same technology base, a semantic 
compatibility is built in by default. Of course, other solution patterns are also feasible, 
such as central finance or central procurement instances.
This section focuses on hybrid scenarios impacting inventory management. One pos-
sible example is a subsidiary producing a niche product that is nevertheless crucial for


<!-- Page 452 -->

453
9.3 Hybrid Deployment
the entire company. In Figure 9.28, the subsidiary is represented as an SAP S/4HANA 
Cloud instance in the enterprise IT system landscape.
Figure 9.27  Possible Hybrid Deployment Scenarios of SAP S/4HANA and SAP S/4HANA Cloud
Figure 9.28  Manufacturing Example 1 with Tier 2 Acting as Supplier (Scope Item 21T in Cloud 
Solution Scope)
SAP
S/4HANA
SAP
S/4HANA
Cloud
Subcontractors 
Headquarters 
SAP
S/4HANA
SAP
S/4HANA
Cloud
Affiliates 
Corporate
SAP
S/4HANA 
SAP
S/4HANA
Cloud
Central Services 
SAP
S/4HANA
Cloud
SAP
S/4HANA
Cloud
SAP
S/4HANA
Ecosystem 
SAP
S/4HANA
Cloud
Subsidiaries
Dealers 
Create goods 
receipt
Create goods
issue  
Clear accounts
receivable
PrdO
SAP S/4HANA Cloud
SAP S/4HANA
On-Premise
Subsidiary (Tier 2)
Headquarters (Tier 1)
Create billing
document
Create sales
order
Create
purchase order
PO
GR
AC
SO
GI
BL


<!-- Page 453 -->

9 Inventory Management in SAP Business Suite
454
Black arrows indicate the data flow between process steps, and white arrows indicate 
the document flow within one tier. The advantage of this setup is that the internal busi-
ness processes of the headquarters and subsidiaries remain independent from each 
other, so they can evolve at a different pace. The interface between them is clearly de-
fined by the processes and the involved business objects.
When ordering a product in the subsidiary, headquarters creates a purchase order, which 
automatically triggers the creation of a sales order in the SAP S/4HANA Cloud instance. 
This is available as solution process  2EL and 2EJ (Section 9.2.1). As a demand element, this 
sales order triggers the production order at the subsidiary, and then the subsidiary will 
produce and issue the finished goods back to headquarters against the sales order. When 
the ordered product arrives at headquarters, the goods receipt against the purchase 
order triggers the financial postings, eventually clearing the account receivables at the 
subsidiary. Additional interfaces are available in SAP S/4HANA Cloud so that progress of 
the internal steps in tier 2 can be monitored from tier 1.
In the second example outlined in Figure 9.29, the subsidiary is also represented as an 
SAP S/4HANA Cloud instance in the enterprise IT system landscape. Here as well, black 
arrows indicate the data flow between process steps, and white arrows indicate the doc-
ument flow within one tier. In this case, however, tier 2 acts as a subcontractor of tier 1.
When ordering a product in the subsidiary, headquarters creates a subcontracting pur-
chase order, which automatically triggers the creation of a sales order in the SAP S/4HANA 
Cloud instance. Furthermore, headquarters provides the free-issue stock required to com-
plete the production process at the subcontractor. This stock is kept as the stock provided 
to supplier with a special stock type in the headquarters’ inventory management. As the 
demand element, the sales order triggers the production order at the subsidiary, and the 
subsidiary produces the finished goods using the free goods from headquarters, and then 
issues the finished goods back to headquarters against the sales order. When the finished 
goods arrive at headquarters, the goods receipt against the subcontracting purchase 
order triggers the financial postings, eventually clearing the accounts receivable at the 
subsidiary and clearing the stock provided to the supplier in inventory management.
The advantage of the subcontracting scenario is that the free-issue stock provided by 
headquarters does have to be kept in the books of account at the subsidiary. Like exam-
ple 1, additional interfaces are available in SAP S/4HANA Cloud so that progress of the 
internal steps in tier 2 can be monitored from tier 1 (Section 9.1.3).
Both examples illustrate the advantages of semantic compatibility between SAP 
S/4HANA and SAP S/4HANA Cloud. The SAP S/4HANA Cloud will incorporate the latest 
technology with every quarterly upgrade, but the technical and the business interfaces 
will remain stable. The SAP S/4HANA instance, on the other hand, will most certainly 
evolve at a much slower pace from a technical perspective, as on-premise upgrades are


<!-- Page 454 -->

455
9.3 Hybrid Deployment
very time consuming. However, by using a two-tier scenario, even on-premise 
instances can indirectly benefit from the latest technologies.
Figure 9.29  Manufacturing Example 2 with Tier 2 Acting as Subcontractor (Solution Process 
2WL in Cloud Solution Scope)
9.3.2    Decentralized Warehouse Management with SAP S/4HANA
All SAP S/4HANA editions (cloud and on-premise) offer the capability to link inventory 
management to an external warehouse management system (WMS). After setting up 
the basic communication, pairs of plants and storage locations of the SAP S/4HANA 
organizational structure are connected to the external WMS. All stock quantities must 
be synchronized between both systems before this link is established. After the link is 
established, inventory postings involving these pairs are automatically converted into 
outbound and inbound delivery documents (see Figure 9.30). As this is an asynchro-
nous process, stock quantities in the involved plant/storage location aren’t updated 
until the process is completed by updating the outbound/inbound delivery document 
so that a goods issue or a goods receipt (respectively) is posted to inventory.
Create goods 
receipt
Create goods  
issue
Clear accounts
receivable
PrdO
SAP S/4HANA Cloud
SAP S/4HANA
On-Premise
ST
ST
Clear accounts receivable
Subsidiary (Tier 2) 
Headquarters (Tier 1)
Create billing
document
Create sales
order
Create
subcontractor
purchase order
Provide
free-issue
stock at
supplier
PO
GR
AC
SO
GI
BL


<!-- Page 455 -->

9 Inventory Management in SAP Business Suite
456
Figure 9.30  Integration between SAP S/4HANA and an External WMS (Solution Process 1ZQ)
Figure 9.31 shows the result of a posting involving a storage location linked to a decen-
tralized WMS.
Figure 9.31  Material Transfer Posting into a Storage Location Linked to a Decentralized 
Warehouse
The general setup of the decentralized WMS can be found in Chapter 3, Section 3.1.5. The 
plant/storage location pairs linked to the external warehouse serve as proxy objects 
representing the stock within the external warehouse. The organizational setup within 
the external warehouse may be totally different.
 
Note
In case you would like to integrate a decentralized WMS by the Material Documents 
OData service (Section 9.1.3), you need to maintain the attribute External WMS Control
during the create operation.
SAP S/4HANA
External Warehouse
Management
Inbound Delivery Document
Outbound Delivery Document
Plant A/
StorLoc 02
Plant A/
StorLoc 01
Plant A/
StorLoc 02
Plant A/
StorLoc 01


<!-- Page 456 -->

457
9.4 Cloud Solutions
9.3.3    SAP Extended Warehouse Management for SAP S/4HANA Cloud 
Public Edition
Another hybrid deployment scenario is linking an SAP S/4HANA Cloud Public Edition 
instance to an SAP Extended Warehouse Management (SAP EWM) system deployed on 
an SAP Cloud ERP Private stack. This is covered by the solution process SAP EWM for 
SAP S/4HANA Integration (7L1), which supports customers who have finance and logis-
tics processes covered by SAP S/4HANA Cloud Public Edition, but require warehouse 
processes only covered in SAP EWM in the private cloud.
Similar to Figure 9.31, an inbound/outbound delivery document is used for communi-
cating between the SAP S/4HANA Cloud Public Edition instance and the SAP EWM 
instance. In addition, the two-tier scenario entails the following:
▪Inbound processing from supplier
▪Outbound processing to customer
▪Delivery-based production integration for production supply and goods receipt from 
production
▪Customer returns
▪Batch management for the transfer of batches to SAP EWM
▪Stock transport orders
▪Warehouse stock handling
The SAP S/4HANA Cloud Public Edition system is the leading instance to create batches. 
Handling unit management is only possible in the SAP EWM instance.
9.4    Cloud Solutions
Cloud solutions are one of the fastest evolving IT business areas. The same is true for 
SAP’s cloud solutions. The following sections try to summarize the most prominent 
trends and strategic cloud products.
9.4.1    SAP Integrated Business Planning
SAP Integrated Business Planning (SAP IBP) is a cloud-based solution combining sales 
and operation planning, inventory optimization, demand, demand-driven replenish-
ment, and response and supply—altogether representing a synchronized planning phi-
losophy. On top is SAP Supply Chain Control Tower to oversee all supply chain 
operations in real time, as illustrated in Figure 9.32.
The basis is a set of APIs that integrate with various operational ERP systems, for exam-
ple SAP S/4HANA or SAP S/4HANA Cloud. SAP IBP allows you to define flexible planning 
horizons and planning periods in which you can perform strategical, tactical and oper-
ational supply chain planning. Internally, statistical and machine learning algorithms


<!-- Page 457 -->

9 Inventory Management in SAP Business Suite
458
of the Predictive Analysis Library (PAL) or Supply Chain Algorithm Library (SCAL) are 
applied during forecasting and optimization. SAP IBP inherently supports multiple 
planning views and simulation runs. We’ll focus on the parts that are directly related to 
inventory management in the following sections.
 
Further Resources
For a comprehensive introduction to SAP IBP, we recommend SAP Integrated Business 
Planning: Functionality and Implementation by Sandy Markin, Amit Sinha, Sanchit 
Chandna, and Jay Foster (SAP PRESS, 2021).
Figure 9.32  SAP IBP Components Drawn as Schema
Inventory Optimization
The prerequisites for starting inventory optimization tasks in SAP IBP include the fol-
lowing:
▪Modeling the supply chain network to identify the optimization opportunities (see 
Figure 9.33)
▪Having reliable demand figures via the demand sensing capabilities of SAP IBP
Based on this input, SAP IBP calculates safety stock and/or reorder stock for each net-
work node and, with forecast reliability, helps to evaluate the current modeling. Fore-
cast reliability has a significant impact on safety stock calculation. SAP IBP allows you 
to evaluate the forecast reliability and optimize forecast algorithm settings with the 
Manage Forecast Error Calculations app. The app automatically deals with various types 
of demand variability, which may lead to forecast errors. Typical patterns are frequent, 
intermittent, and seasonal demands, as well as missing data, outliers, or a forecast bias.
SAP Supply Chain Control Tower
Sales and Operations Planning
Inventory
Optimization
Demand-Driven
Replenishment
Response and
Supply
Demand
Master Data and Transactional Data Integration


<!-- Page 458 -->

459
9.4 Cloud Solutions
Figure 9.33  Inventory Optimization Using Simple or Multiechelon Supply Chain Networks 
Models
Demand Planning
SAP IBP offers out-of-the-box integration to SAP S/4HANA Cloud Public Edition via the 
solution process SAP IBP for Demand – Demand Forecast for SAP S/4HANA Cloud, Pub-
lic Edition (78P). Based on the sales order history, SAP IBP calculates planned indepen-
dent requirements (PIRs) in SAP S/4HANA Cloud to trigger the make-to-stock (MTS) 
production process. Figure 9.34 shows how SAP IBP’s demand planning and forecasting 
capabilities can be integrated into the MTS process running in SAP S/4HANA Cloud.
Figure 9.34  MTS Scenario with Demand Planning in SAP IBP
Simple Supply Chain
Regional
DC
Local DC
Multi-Echelon Supply Chain
Supplier
Plant
Distribution Center (DC)
Customer
Legend
SAP IBP
SAP S/4HANA Cloud
PIRs
Forecasting
MRP Run
Production
Execution
Goods
Receipt
Stock
Master Data
and Sales
History


<!-- Page 459 -->

9 Inventory Management in SAP Business Suite
460
Demand Driven Replenishment
SAP IBP supports demand-driven material requirements planning (DDMRP) by identi-
fying and calculating the required buffers (see Chapter 4, Section 4.8). Unlike the buffer 
calculation in SAP S/4HANA, SAP IBP is able to identify and calculate the required buf-
fers based the data of the complete enterprise supply chain.
9.4.2    SAP Digital Manufacturing
SAP Digital Manufacturing serves as the manufacturing execution system (MES) in SAP 
landscapes. It supports monitoring manufacturing operations and material flows in real 
time and relates their execution status and the outcome back to the SAP S/4HANA system.
You can link your SAP S/4HANA Cloud Public Edition instance to SAP Digital Manufac-
turing using the solution processes 2JN, 1Y5, and 3W3. As shown in Figure 9.35, the inte-
gration is achieved via master data (material, batch, bill of materials [BOM], work center, 
routing, etc.) and transactional data (production order, process order, floor stock, 
inspection lot/defect recordings).
Figure 9.35  MES Integration
In addition to SAP S/4HANA, SAP Digital Manufacturing can also integrate with SAP 
EWM (not shown).
9.4.3    SAP Business Network for Procurement
Figure 9.36 shows the integration of SAP Business Network for Procurement into the 
procure-to-pay process of SAP S/4HANA. SAP Business Network for Procurement offers 
configuration of procurement catalogs (guided buying capability), sourcing, MRP 
SAP Digital Manufacturing
SAP S/4HANA
Order Status +
Confirmation 
Batch/Quality Updates
Manufacturing
Execution
Batch
Production/
Process Order
Quality
Management
Master Data and
Production/Process
Order


<!-- Page 460 -->

461
9.4 Cloud Solutions
change request updates, and the execution of the entire procure-to-pay process. On the 
right-hand side, you see a set of different suppliers registered with SAP Business Net-
work for Procurement, which serves as a consolidation hub during the procurement 
process. Once you start your procurement process through SAP Business Network for 
Procurement, the application takes care of the communication steps during the pro-
curement operation, such as purchase order creation, purchase order confirmation, 
advanced shipping notification, goods receipt propagation, invoice processing, and 
exception handling. SAP Business Network for Procurement consolidates the docu-
ments and forwards them to your SAP S/4HANA instance.
Figure 9.36  Managing Procure to Pay with SAP S/4HANA and SAP Business Network 
for Procurement
9.4.4    SAP Business Data Cloud and SAP Analytics Cloud
SAP Business Data Cloud is a data repository (also known as a data lake) of semantically 
aligned business data collected across SAP Business Suite. Its content can be visualized 
with SAP Analytics Cloud, which provides a rich set of data visualization options. Unlike 
the analytic applications described in Chapter 8, SAP Business Data Cloud doesn’t rely 
on the data collected within one system instance in a certain time frame, but rather 
consolidates the data of the entire SAP Business Suite and thus serves strategic cross-
system (and cross-business), time frame-independent reporting and analytics purposes.
Figure 9.37 illustrates SAP Business Data Cloud together with SAP Analytics Cloud. The 
technical view on the left-hand side shows how SAP-provided content enables data 
extraction out of SAP S/4HANA or out of other systems via plug and play. The content is 
based on business objects and grouped into data products (dashed line in Figure 9.37) 
SAP
S/4HANA
Supplier A
Supplier B
Supplier C
Supplier D
Supplier E
Consolidated
Documents
Purchase Order Confirmation
SAP Business
Network for
Procurement
Goods Receipt
Invoice
Exception
Purchase Order
Consolidated
Documents
Advanced Shipping Notification


<!-- Page 461 -->

9 Inventory Management in SAP Business Suite
462
according to business capabilities such as supply chain, procurement, financials, etc. and 
is based on a uniform and consistent semantic description. Extraction comprises trans-
actional data as well as referenced master data or code lists. The technical implementa-
tion includes initial and delta extraction mechanisms, if needed. On top of the content, 
you may create queries (for example, using SAP Analytics Cloud) to visualize KPIs 
derived from one or many extracted business objects. The right-hand side maps the 
business perspective of calculating the annual material stock per query via a query on 
extracted material document postings to the technical artifacts on the left-hand side.
Figure 9.37  Technical View and Business View on SAP Business Data Cloud
9.5    Summary
This chapter set out to provide insight into your deployment options and how inven-
tory management functions in SAP Business Suite. In doing so, it has also provided an 
outlook for the future of the SAP product portfolio.
Initially, custom extensibility was discussed and SAP BTP and SAP Business Accelerator 
Hub were introduced. The next section presented SAP S/4HANA Cloud as a deployment 
model for business in the cloud, including the solution scope and implementation me-
thodology. Then, different deployment options were discussed. In addition to an on-
premise deployment, the general aspects of cloud deployment were introduced, as well 
as hybrid deployment models, where either part of the technology or part of the business 
processes are deployed in the cloud and schematically delineated. We covered several 
other hybrid deployment models, and then explored key cloud solutions: SAP IBP, SAP 
Digital Manufacturing, SAP Business Network for Procurement, and SAP Business Data 
Cloud, with a focus on inventory management.
We hope you’ve enjoyed reading the book and that we were able to meet the expecta-
tions raised in the preface. One last closing remark: There is no need to travel to Wall-
dorf to get the latest SAP S/4HANA package; details can be found at www.sap.com.
BO1
SAP S/4HANA
BO2
BO3
BO4
Other
Technical View
Business View
Number
Year
Quantity
Unit
Material
4500001
2025
+10
PC
MatA
4500002
2025
-5
PC
MatA
Year
Stock
Quantity 
Unit
Material
2025
+5
PC
MatA
Extraction
Material
Documents
Material
Document
Extract
Annual Material
Stock per Query
SAP Business Data Cloud
BO4
Query1
Query2
SAP Analytics Cloud
BO3
BO1
BO2
4500001
2025
+10
PC
MatA
4500002
2025
-5
PC
MatA
Number
Year
Quantity
Unit
Material
Extraction
Extraction
Extraction
Extraction
