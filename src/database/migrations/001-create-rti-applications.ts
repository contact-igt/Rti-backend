import type { QueryInterface, Transaction } from 'sequelize';

export const migration001 = {
  name: '001-create-rti-applications',
  async up(queryInterface: QueryInterface, transaction: Transaction): Promise<void> {
    await queryInterface.sequelize.query(
      `CREATE TABLE rti_applications (
        id VARCHAR(100) NOT NULL,
        owner_user_id VARCHAR(100) NOT NULL,
        registration_number VARCHAR(100) NOT NULL,
        submission_key VARCHAR(200) NULL,
        application_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uq_rti_applications_registration_number (registration_number),
        UNIQUE KEY uq_rti_applications_submission_key (submission_key),
        KEY ix_rti_applications_owner_user_id (owner_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      { transaction }
    );
  }
};
