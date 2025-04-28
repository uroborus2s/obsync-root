/**
 * 默认迁移模板文件: {{tableName}}
 */

/**
 * @param {import('knex')} knex
 * @returns {Promise}
 */
exports.up = async function (knex) {
  return knex.schema.createTable('{{tableName}}', function (table) {
    {
      {
        schemaDefinition;
      }
    }
    {
      {
        foreignKeys;
      }
    }
  });
};

/**
 * @param {import('knex')} knex
 * @returns {Promise}
 */
exports.down = async function (knex) {
  return knex.schema.dropTableIfExists('{{tableName}}');
};
