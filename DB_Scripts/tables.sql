
-- For ACTS Access Restrictions
CREATE TABLE acts_restrictions (
	id INT PRIMARY KEY IDENTITY(1,1),
	biometrics_id NVARCHAR(50),
	role NVARCHAR(50),
)

-- Ticket Parent
CREATE TABLE acts_ticket(
	id INT PRIMARY KEY IDENTITY(1,1),
	title NVARCHAR(255),
	status NVARCHAR(255),
	urgent BIT,
    submitter NVARCHAR(255),
	created_at DATETIME DEFAULT GETDATE(),
	created_by NVARCHAR(255),
	updated_at DATETIME,
    updated_by NVARCHAR(255),
	completed_at DATETIME,
    completed_by NVARCHAR(255),
    customer NVARCHAR(255), 
    email_title NVARCHAR(255), 
    sales_in_charge NVARCHAR(255),
    date_and_time_of_email DATETIME, 
    timely_response BIT, 
    deadline DATETIME, 
    remarks NVARCHAR(255)
)

-- Ticket Section
CREATE TABLE acts_ticket_section(
	id INT PRIMARY KEY IDENTITY(1,1),
	ticket_id INT,
	sub_title NVARCHAR(255),
    body NVARCHAR(MAX)
)

-- Ticket Section Images
CREATE TABLE acts_ticket_section_images(
	id INT PRIMARY KEY IDENTITY(1,1),
	ticket_section_id INT,
	image NVARCHAR(MAX)
)

-- Master List
CREATE TABLE lrn_master_list (
    id                        INT            NOT NULL,
    EmployeeID                NVARCHAR(50)    NOT NULL,
    LastName                  NVARCHAR(50)    NOT NULL,
    FirstName                 NVARCHAR(50)    NOT NULL,
    MiddleName                NVARCHAR(200)  NULL,
    Birthday                  DATE           NOT NULL,
    Gender                    NVARCHAR(10)    NOT NULL,
    Company                   NVARCHAR(100)   NOT NULL,
    Location                  NVARCHAR(100)   NOT NULL,
    DateHired                 DATE           NOT NULL,
    TotalYearDays             NVARCHAR(100)   NOT NULL,
    RateType                  NVARCHAR(100)   NOT NULL,
    Rate                      NVARCHAR(100)   NOT NULL,
    PayrollSchedule           NVARCHAR(100)   NOT NULL,
    SSSMode                   NVARCHAR(100)   NOT NULL,
    HDMFMode                  NVARCHAR(100)   NOT NULL,
    PHICMode                  NVARCHAR(100)   NOT NULL,
    WHTAXMode                 NVARCHAR(100)   NULL,
    SSSFrequency              NVARCHAR(100)   NULL,
    HDMFFrequency             NVARCHAR(100)   NULL,
    PHICFrequency             NVARCHAR(100)   NULL,
    WHTaxFrequency            NVARCHAR(100)   NULL,
    NoHours                   NVARCHAR(100)   NULL,
    RoleProfile               NVARCHAR(100)   NULL,
    JobLevel                  NVARCHAR(100)   NULL,
    IsPWD                     NVARCHAR(10)    NULL,
    IsAssistantManager        NVARCHAR(10)    NULL,
    IsActive                  NVARCHAR(10)    NULL,
    PositionTitle             NVARCHAR(100)   NULL,
    Department                NVARCHAR(100)   NULL,
    ReportsTo                 NVARCHAR(100)   NULL,
    Section                   NVARCHAR(100)   NULL,
    SubDepartment             NVARCHAR(100)   NULL,
    Classification            NVARCHAR(100)   NULL,
    PeriodGroup               NVARCHAR(100)   NULL,
    SSSNumber                 NVARCHAR(50)    NULL,
    PHICNumber                NVARCHAR(50)    NULL,
    HDMFNumber                NVARCHAR(50)    NULL,
    TIN                       NVARCHAR(50)    NULL,
    SensitivityLevel          NVARCHAR(100)   NULL,
    AttendanceBase            NVARCHAR(100)   NULL,
    IgnoreUndertime           NVARCHAR(10)    NULL,
    IgnoreLate                NVARCHAR(10)    NULL,
    IgnoreNightdiff           NVARCHAR(10)    NULL,
    GracePeriod               NVARCHAR(100)   NULL,
    LeaveApproverLevel        NVARCHAR(100)   NULL,
    OfficialBusinessApproverLevel NVARCHAR(100) NULL,
    CTOApproverLevel          NVARCHAR(100)   NULL,
    OvertimeApproverLevel     NVARCHAR(100)   NULL,
    ChangeScheduleApproverLevel NVARCHAR(100) NULL,
    DTRProblemApproverLevel   NVARCHAR(100)   NULL,
    IsSoloParent              NVARCHAR(10)    NULL,
    CivilStatus               NVARCHAR(50)    NULL,
    Spouse                    NVARCHAR(100)   NULL,
    BiometricsID              NVARCHAR(100)   NULL,
    EmploymentStatus          NVARCHAR(100)   NULL,
    Nationality               NVARCHAR(100)   NULL,
    Email                     NVARCHAR(100)   NULL,
    SaturdayOffEntitlement    NVARCHAR(100)   NULL,
    Shift                     NVARCHAR(100)   NULL,
    CostCenter                NVARCHAR(100)   NULL,
    Address                   NVARCHAR(510)  NULL,
    ContactNumber             NVARCHAR(100)  NULL,
    DefaultSchedule           NVARCHAR(50)    NULL
);

CREATE TABLE lrnph_users (
    user_id     INT             NOT NULL,
    username    NVARCHAR(100)   NOT NULL,
    password    NVARCHAR(510)   NOT NULL,
    role        NVARCHAR(100)   NOT NULL,
    empcode     NVARCHAR(40)    NOT NULL,
    created_at  DATETIME        NULL,
    updated_at  DATETIME        NULL,
    status      NVARCHAR(40)    NULL,
    login_token NVARCHAR(510)   NULL,
    department  NVARCHAR(100)    NULL
);