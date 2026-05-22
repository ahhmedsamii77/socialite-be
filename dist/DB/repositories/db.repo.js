"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBRepository = void 0;
class DBRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    create = async (data) => {
        return await this.model.create(data);
    };
    findOne = async (filter, select, options) => {
        const doc = this.model.findOne(filter, select, options);
        if (options?.lean)
            doc.lean(options.lean);
        if (options?.populate)
            doc.populate(options.populate);
        return await doc.exec();
    };
    findById = async (id, select, options) => {
        return await this.model.findById(id, select, options);
    };
    find = async (filter, select, options) => {
        return await this.model.find(filter, select, options);
    };
    pagePaginate = async ({ filter, select, options, query, }) => {
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
    findOneAndUpdate = async (filter, update, options) => {
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
        return await this.model.findOneAndUpdate(filter, { ...update, $inc: { __v: 1 } }, { ...options, new: true });
    };
    updateOne = async (filter, update, options) => {
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
        return await this.model.updateOne(filter, { ...update, $inc: { __v: 1 } }, options);
    };
    updateMany = async (filter, update, options) => {
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
        return await this.model.updateMany(filter, { ...update, $inc: { __v: 1 } }, options);
    };
    deleteMany = async (filter, options) => {
        return await this.model.deleteMany(filter, options);
    };
    deleteOne = async (filter, options) => {
        return await this.model.deleteOne(filter, options);
    };
    findOneAndDelete = async (filter, options) => {
        return await this.model.findOneAndDelete(filter, options);
    };
}
exports.DBRepository = DBRepository;
