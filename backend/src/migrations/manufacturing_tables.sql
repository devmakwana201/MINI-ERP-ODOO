CREATE TABLE IF NOT EXISTS bill_of_materials (
  bomid INT AUTO_INCREMENT PRIMARY KEY,
  bomname VARCHAR(100) NOT NULL,
  productid INT NOT NULL COMMENT 'Finished product (FK to itemmaster)',
  quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00 COMMENT 'Qty this BoM produces',
  uom VARCHAR(50),
  companyid INT DEFAULT 0,
  isdeleted TINYINT(1) DEFAULT 0,
  createdby INT,
  createdon DATETIME DEFAULT CURRENT_TIMESTAMP,
  modifiedby INT,
  modifiedon DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bom_company_product (companyid, productid, isdeleted)
);

CREATE TABLE IF NOT EXISTS bom_components (
  bomcomponentid INT AUTO_INCREMENT PRIMARY KEY,
  bomid INT NOT NULL,
  componentid INT NOT NULL COMMENT 'FK to itemmaster (raw material)',
  quantity DECIMAL(12,2) NOT NULL COMMENT 'Qty needed per BoM qty',
  uom VARCHAR(50),
  isdeleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (bomid) REFERENCES bill_of_materials(bomid)
);

CREATE TABLE IF NOT EXISTS bom_operations (
  bomoperationid INT AUTO_INCREMENT PRIMARY KEY,
  bomid INT NOT NULL,
  operationname VARCHAR(100) NOT NULL COMMENT 'e.g. Assembly, Painting, Packing',
  workcenter VARCHAR(100),
  duration INT NOT NULL DEFAULT 0 COMMENT 'Expected duration in minutes for BoM base qty',
  sequence INT DEFAULT 0,
  isdeleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (bomid) REFERENCES bill_of_materials(bomid)
);

CREATE TABLE IF NOT EXISTS manufacturing_orders (
  moid INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(50) NOT NULL COMMENT 'MO-000001 format',
  productid INT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  uom VARCHAR(50),
  bomid INT COMMENT 'FK to bill_of_materials',
  assigneeid INT COMMENT 'FK to usermaster',
  locationid INT NOT NULL COMMENT 'Stock location used for consumption and finished goods',
  scheduledate DATE,
  status ENUM('draft','confirmed','in_progress','done','cancelled') DEFAULT 'draft',
  companyid INT DEFAULT 0,
  isdeleted TINYINT(1) DEFAULT 0,
  createdby INT,
  createdon DATETIME DEFAULT CURRENT_TIMESTAMP,
  modifiedby INT,
  modifiedon DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_manufacturing_order_reference (companyid, reference),
  KEY idx_mo_company_status (companyid, status, isdeleted)
);

CREATE TABLE IF NOT EXISTS mo_components (
  mocomponentid INT AUTO_INCREMENT PRIMARY KEY,
  moid INT NOT NULL,
  componentid INT NOT NULL,
  to_consume DECIMAL(12,2) NOT NULL,
  consumed DECIMAL(12,2) DEFAULT 0,
  uom VARCHAR(50),
  availability ENUM('available','not_available') DEFAULT 'not_available',
  isdeleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (moid) REFERENCES manufacturing_orders(moid),
  KEY idx_mo_components_moid (moid, isdeleted)
);

CREATE TABLE IF NOT EXISTS mo_work_orders (
  moworkorderid INT AUTO_INCREMENT PRIMARY KEY,
  moid INT NOT NULL,
  operationname VARCHAR(100) NOT NULL,
  workcenter VARCHAR(100),
  expected_duration INT DEFAULT 0 COMMENT 'Minutes, scaled by MO qty',
  real_duration INT DEFAULT 0 COMMENT 'Actual minutes (entered by operator)',
  status ENUM('pending','in_progress','done','cancelled') DEFAULT 'pending',
  sequence INT DEFAULT 0,
  isdeleted TINYINT(1) DEFAULT 0,
  FOREIGN KEY (moid) REFERENCES manufacturing_orders(moid)
);

CREATE TABLE IF NOT EXISTS manufacturing_audit_logs (
  logid INT AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(50) NOT NULL DEFAULT 'Manufacturing',
  referenceid INT NOT NULL COMMENT 'moid or bomid',
  referencetype VARCHAR(50) NOT NULL COMMENT 'MO or BOM',
  action VARCHAR(100) NOT NULL,
  oldvalue TEXT,
  newvalue TEXT,
  userid INT,
  createdon DATETIME DEFAULT CURRENT_TIMESTAMP
);
