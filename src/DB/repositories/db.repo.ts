import { MongooseUpdateQueryOptions, PopulateOptions } from "mongoose";
import {
  DeleteResult,
  ProjectionType,
  QueryOptions,
  Types,
  UpdateQuery,
  UpdateResult,
  HydratedDocument,
  Model,
  QueryFilter,
  FlattenMaps,
} from "mongoose";

export abstract class DBRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  create = async (
    data: Partial<TDocument>,
  ): Promise<HydratedDocument<TDocument>> => {
    return await this.model.create(data);
  };
  findOne = async (
    filter: QueryFilter<TDocument>,
    select?: ProjectionType<TDocument>,
    options?: QueryOptions<TDocument>,
  ): Promise<
    | HydratedDocument<FlattenMaps<TDocument>>
    | HydratedDocument<TDocument>
    | null
  > => {
    const doc = this.model.findOne(filter, select, options);
    if (options?.lean) doc.lean(options.lean);
    if (options?.populate) doc.populate(options.populate as PopulateOptions[]);
    return await doc.exec();
  };

  findById = async (
    id: Types.ObjectId,
    select?: ProjectionType<TDocument>,
    options?: QueryOptions,
  ): Promise<HydratedDocument<TDocument> | null> => {
    return await this.model.findById(id, select, options);
  };

  find = async (
    filter: QueryFilter<TDocument>,
    select?: ProjectionType<TDocument>,
    options?: QueryOptions,
  ): Promise<HydratedDocument<TDocument>[]> => {
    return await this.model.find(filter, select, options);
  };

  pagePaginate = async ({
    filter,
    select,
    options,
    query,
  }: {
    filter: QueryFilter<TDocument>;
    select?: ProjectionType<TDocument>;
    query: { page: number; limit: number };
    options?: QueryOptions;
  }) => {
    let { page, limit } = query;
    page = Number(page) || 1;
    limit = Number(limit) || 5;
    const skip = (page - 1) * limit;
    const docs = await this.model.find(filter, select, {
      ...options,
      skip,
      limit,
    });
    const count = await this.model.countDocuments({
      deletedAt: { $exists: false },
    });
    const numberOfPages = Math.ceil(count / limit);
    return { currentPage: page, count, numberOfPages, docs };
  };

  findOneAndUpdate = async (
    filter: QueryFilter<TDocument>,
    update: UpdateQuery<TDocument>,
    options?: QueryOptions,
  ): Promise<HydratedDocument<TDocument> | null> => {
    if (Array.isArray(update)) {
      update.push({
        $set: {
          __v: { $add: ["$__v", 1] },
        },
      });
      return await this.model.findOneAndUpdate(filter, update, {
        ...options,
        updatePipeline: true,
        new: true,
      });
    }
    return await this.model.findOneAndUpdate(
      filter,
      { ...update, $inc: { __v: 1 } },
      { ...options, new: true },
    );
  };

  updateOne = async (
    filter: QueryFilter<TDocument>,
    update: UpdateQuery<TDocument>,
    options?: MongooseUpdateQueryOptions<TDocument>,
  ): Promise<UpdateResult> => {
    if (Array.isArray(update)) {
      update.push({
        $set: {
          __v: { $add: ["$__v", 1] },
        },
      });
      return await this.model.updateOne(filter, update, {
        ...options,
        updatePipeline: true,
      });
    }
    return await this.model.updateOne(
      filter,
      { ...update, $inc: { __v: 1 } },
      options,
    );
  };
  updateMany = async (
    filter: QueryFilter<TDocument>,
    update: UpdateQuery<TDocument>,
    options?: MongooseUpdateQueryOptions<TDocument>,
  ): Promise<UpdateResult> => {
    if (Array.isArray(update)) {
      update.push({
        $set: {
          __v: { $add: ["$__v", 1] },
        },
      });
      return await this.model.updateMany(filter, update, {
        ...options,
        updatePipeline: true,
      });
    }
    return await this.model.updateMany(
      filter,
      { ...update, $inc: { __v: 1 } },
      options,
    );
  }
  
  deleteMany = async (
    filter: QueryFilter<TDocument>,
    options?: CookieStoreDeleteOptions,
  ): Promise<DeleteResult> => {
    return await this.model.deleteMany(filter, options);
  };
  deleteOne = async (
    filter: QueryFilter<TDocument>,
    options?: CookieStoreDeleteOptions,
  ): Promise<DeleteResult> => {
    return await this.model.deleteOne(filter, options);
  };

  findOneAndDelete = async (
    filter: QueryFilter<TDocument>,
    options?: CookieStoreDeleteOptions,
  ): Promise<HydratedDocument<TDocument> | null> => {
    return await this.model.findOneAndDelete(filter, options);
  };
}
