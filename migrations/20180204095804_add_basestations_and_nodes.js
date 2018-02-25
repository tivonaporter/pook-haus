exports.up = function(knex, Promise) {
  return knex.schema.createTable('basestations', function(table) {
    table.string('id').primary()
    table.string('name')
  }).createTable('nodes', function(table) {
    table.string('id').primary()
    table.string('name')
    table.string('basestation_id').references('basestations.id')
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('basestations').dropTable('nodes')
};
