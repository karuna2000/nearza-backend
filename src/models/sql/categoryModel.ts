import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "../../config/sequelize";

class Category extends Model<
  InferAttributes<Category, { omit: "createdAt" | "updatedAt" | "deletedAt" }>,
  InferCreationAttributes<Category, { omit: "createdAt" | "updatedAt" }>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: CreationOptional<string>;
  declare description: CreationOptional<string | null>;
  declare categoryImage: CreationOptional<string | null>;
  declare isDisabled: CreationOptional<boolean>;

  // timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
  declare readonly deletedAt: CreationOptional<Date | null>;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 150],
      },
      set(value: string) {
        if (!value) return;
        const cleaned = value.trim().toLowerCase();
        this.setDataValue("name", cleaned);
      },
    },

    slug: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    categoryImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isDisabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "categories",
    modelName: "Category",
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ["slug"] },
      { fields: ["isDisabled"] },
      { fields: ["isDisabled", "createdAt"] },
    ],

    hooks: {
      beforeValidate: (category) => {
        if (category.name) {
          category.slug = category.name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
        }
      },
    },
  },
);

const categoryModel = Category;
export { categoryModel };
