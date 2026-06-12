# MosqueOS — Database Documentation

## 1. Overview

- **Database Name:** MosqueOS
- **DBMS:** Microsoft SQL Server
- **Version:** SQL Server 2019+
- **Created By:** [Your Name]
- **Date:** [Date]

---

## 2. Tables

### 2.1 AspNetUsers (Identity Users)
| Column       | Data Type     | Constraints         | Description              |
|--------------|---------------|---------------------|--------------------------|
| Id           | NVARCHAR(450) | PK, NOT NULL        | Unique user identifier   |
| UserName     | NVARCHAR(256) | UNIQUE, NOT NULL    | Login username           |
| Email        | NVARCHAR(256) | UNIQUE              | User email address       |
| PasswordHash | NVARCHAR(MAX) | NOT NULL            | Hashed password          |

### 2.2 Members
| Column       | Data Type     | Constraints         | Description              |
|--------------|---------------|---------------------|--------------------------|
| MemberId     | INT           | PK, IDENTITY        | Unique member ID         |
| FullName     | NVARCHAR(200) | NOT NULL            | Member full name         |
| PhoneNumber  | NVARCHAR(20)  |                     | Contact number           |
| Address      | NVARCHAR(500) |                     | Member address           |
| JoinDate     | DATE          | NOT NULL            | Date of registration     |
| IsActive     | BIT           | DEFAULT 1           | Active status            |

### 2.3 Donations
| Column       | Data Type     | Constraints         | Description              |
|--------------|---------------|---------------------|--------------------------|
| DonationId   | INT           | PK, IDENTITY        | Unique donation ID       |
| MemberId     | INT           | FK → Members        | Donor reference          |
| Amount       | DECIMAL(10,2) | NOT NULL            | Donation amount          |
| DonationDate | DATE          | NOT NULL            | Date of donation         |
| Notes        | NVARCHAR(500) |                     | Optional remarks         |

### 2.4 Events
| Column       | Data Type     | Constraints         | Description              |
|--------------|---------------|---------------------|--------------------------|
| EventId      | INT           | PK, IDENTITY        | Unique event ID          |
| Title        | NVARCHAR(200) | NOT NULL            | Event name               |
| EventDate    | DATETIME      | NOT NULL            | Scheduled date/time      |
| Description  | NVARCHAR(MAX) |                     | Event details            |
| CreatedBy    | NVARCHAR(450) | FK → AspNetUsers    | Admin who created it     |

### 2.5 Expenses
| Column       | Data Type     | Constraints         | Description              |
|--------------|---------------|---------------------|--------------------------|
| ExpenseId    | INT           | PK, IDENTITY        | Unique expense ID        |
| Category     | NVARCHAR(100) | NOT NULL            | Expense category         |
| Amount       | DECIMAL(10,2) | NOT NULL            | Expense amount           |
| ExpenseDate  | DATE          | NOT NULL            | Date of expense          |
| Description  | NVARCHAR(500) |                     | Details                  |

---

## 3. Relationships

| Parent Table  | Child Table | FK Column  | Relationship  |
|---------------|-------------|------------|---------------|
| Members       | Donations   | MemberId   | One-to-Many   |
| AspNetUsers   | Events      | CreatedBy  | One-to-Many   |

---

## 4. Primary Keys

| Table        | Primary Key  | Type           |
|--------------|-------------|----------------|
| AspNetUsers  | Id          | NVARCHAR(450)  |
| Members      | MemberId    | INT IDENTITY   |
| Donations    | DonationId  | INT IDENTITY   |
| Events       | EventId     | INT IDENTITY   |
| Expenses     | ExpenseId   | INT IDENTITY   |

---

## 5. Foreign Keys

| FK Name                  | Table     | Column    | References         |
|--------------------------|-----------|-----------|--------------------|
| FK_Donations_Members     | Donations | MemberId  | Members(MemberId)  |
| FK_Events_AspNetUsers    | Events    | CreatedBy | AspNetUsers(Id)    |

---

## 6. Business Rules

1. A donation must always be linked to an existing member.
2. Members cannot be deleted if they have donation records — use `IsActive = 0` instead.
3. Events must have a future `EventDate` at time of creation.
4. Only users with the **Admin** role can create or delete events and manage members.
5. All financial amounts must be greater than 0.
6. `JoinDate` cannot be a future date.
