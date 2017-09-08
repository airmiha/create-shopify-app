export default (sequelize, DataTypes) => {
  const Shop = sequelize.define(
    'Shop',
    {
      domain: {
        type: DataTypes.STRING,
        unique: true
      },
      chargeId: {
        type: DataTypes.BIGINT,
        unique: true
      }
    },
    {
      classMethods: {
        associate() {
          // associations can be defined here
        }
      }
    }
  );
  return Shop;
};
