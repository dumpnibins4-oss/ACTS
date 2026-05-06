
-- For ACTS Access Restrictions
CREATE TABLE acts_restrictions (
	id INT PRIMARY KEY IDENTITY(1,1),
	biometrics_id NVARCHAR(50),
	role NVARCHAR(50),
)

