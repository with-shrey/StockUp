const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

module.exports = function (app) {
    logger.debug({message: 'Defining role and roleMapping models'});
    var mongodb = app.datasources.db;
    var ObjectID = mongodb.connector.getDefaultIdType();
    var RoleMapping = app.models.RoleMapping;
    var UserModel = app.models.UserModel;
    var Role = app.models.Role;

    RoleMapping.defineProperty('principalId', {
        type: ObjectID
    });
    RoleMapping.belongsTo(UserModel);
    UserModel.hasMany(RoleMapping, {foreignKey: 'principalId'});
    UserModel.hasMany(Role, {as: 'roles', through: RoleMapping, foreignKey: 'principalId'});
    Role.hasMany(UserModel, {through: RoleMapping, foreignKey: 'roleId'});
};
