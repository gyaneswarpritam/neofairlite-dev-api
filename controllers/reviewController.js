// controllers/reviewController.js

const Like = require("../models/Like");
const ProductsList = require("../models/ProductsList");
const ProductVisited = require("../models/ProductVisited");
const Review = require("../models/Review");
const Stall = require("../models/Stall");
const { successResponse } = require("../utils/sendResponse");

exports.addReview = async (req, res) => {
    try {
        const { stallId, productListId, visitorId, review } = req.body;
        const reviewData = await Review.findOneAndUpdate(
            { stall: stallId, productList: productListId, visitor: visitorId },
            { stall: stallId, productList: productListId, visitor: visitorId, review },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json(reviewData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAverageReviewsByExhibitorId = async (req, res) => {
    const { exhibitorId } = req.params;

    try {
        // Find the stall associated with the exhibitor
        const stall = await Stall.findOne({ exhibitor: exhibitorId });

        // If no stall is found, return an empty array
        if (!stall) {
            return res.status(200).json([]);
        }

        // Find all product lists associated with the stall
        const productLists = await ProductsList.find({ stall: stall._id });

        // If no product lists found, return an empty array
        if (!productLists || productLists.length === 0) {
            return res.status(200).json([]);
        }

        // For each product list, calculate the average review rating
        const productListsWithAverageReviews = await Promise.all(
            productLists.map(async (productList) => {
                // Find all reviews for the product list
                const reviews = await Review.find({ productList: productList._id });

                // Calculate the average review rating
                const reviewSum = reviews.reduce((sum, review) => sum + review.review, 0);
                const reviewCount = reviews.length;
                const averageReview = reviewCount > 0 ? reviewSum / reviewCount : 0;

                return {
                    ...productList._doc,
                    review: averageReview,
                };
            })
        );


        const successObj = successResponse('Review count', productListsWithAverageReviews)
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products with average reviews', error });
    }
};

exports.getVisitedProductExhibitorId = async (req, res) => {
    const { exhibitorId } = req.params;

    try {
        // Find the stall associated with the exhibitor
        const stall = await Stall.findOne({ exhibitor: exhibitorId });

        // If no stall is found, return an empty array
        if (!stall) {
            return res.status(200).json([]);
        }

        // Find all product lists associated with the stall
        const productLists = await ProductsList.find({ stall: stall._id });

        // If no product lists found, return an empty array
        if (!productLists || productLists.length === 0) {
            return res.status(200).json([]);
        }

        // For each product list, calculate the total visit count
        const productListsWithVisitCounts = await Promise.all(
            productLists.map(async (productList) => {
                // Find all visit entries for the product list
                const visits = await ProductVisited.find({ productList: productList._id });

                // Calculate the total visit count
                const totalVisitCount = visits.reduce((sum, visit) => sum + visit.visitedCount, 0);

                return {
                    ...productList._doc,
                    totalVisitCount,
                };
            })
        );

        const successObj = successResponse('Product visit counts', productListsWithVisitCounts);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products with visit counts', error });
    }
};

exports.getVisitorsByMostViewed = async (req, res) => {
    const { productListId } = req.params;
    const { stallId } = req.body;

    try {
        let query = {};

        // If productListId is provided, filter by it
        if (productListId) {
            query.productList = productListId;
        }
        if (stallId) {
            query.stall = stallId;
        }

        // Find ProductVisited entries and populate visitor details
        const productVisitedEntries = await ProductVisited.find(query)
            .populate('visitor', 'name email phone companyName')
            .populate('productList', 'title');

        // If no ProductVisited entries are found, return a 404 error
        if (!productVisitedEntries || productVisitedEntries.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        // Extract visitor details
        const visitors = productVisitedEntries.map(entry => {
            const { _id, name, email, phone, companyName } = entry.visitor;
            return {
                _id,
                title: entry.productList.title,
                visitorName: `${name || ''}`.trim(),
                visitorEmail: email,
                visitorPhone: phone,
                companyName,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            };
        });

        const successObj = successResponse('most viewed details', visitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching most viewed details', error });
    }
};


exports.getVisitorsByMostReviewed = async (req, res) => {
    const { productListId } = req.params;
    const { stallId } = req.body;

    try {
        let query = {};

        // If productListId is provided, filter by it
        if (productListId) {
            query.productList = productListId;
        }
        if (stallId) {
            query.stall = stallId;
        }
        // Find Review entries and populate visitor details
        const reviewEntries = await Review.find(query)
            .populate('visitor', 'name email phone companyName')
            .populate('productList', 'title');

        // If no review entries are found, return a 404 error
        if (!reviewEntries || reviewEntries.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        // Extract visitor details
        const visitors = reviewEntries.map(entry => {
            const { _id, name, email, phone, companyName } = entry.visitor;
            return {
                _id,
                title: entry.productList.title,
                visitorName: `${name || ''}`.trim(),
                visitorEmail: email,
                visitorPhone: phone,
                companyName,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            };
        });

        const successObj = successResponse('most reviewed details', visitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching most reviewed details', error });
    }
};

exports.getVisitorsByMostLiked = async (req, res) => {
    const { productListId } = req.params;
    const { stallId } = req.body;
    try {
        let query = {};

        // If productListId is provided, filter by it
        if (productListId) {
            query.productList = productListId;
        }
        if (stallId) {
            query.stall = stallId;
        }
        // Find Like entries and populate visitor details
        const likeEntries = await Like.find(query)
            .populate('visitor', 'name email phone companyName')
            .populate('productList', 'title');

        // If no like entries are found, return a 404 error
        if (!likeEntries || likeEntries.length === 0) {
            return res.status(404).json({ message: 'No most liked found' });
        }

        // Extract visitor details
        const visitors = likeEntries.map(entry => {
            const { _id, name, email, phone, companyName } = entry.visitor;
            return {
                _id,
                title: entry.productList.title,
                visitorName: `${name || ''}`.trim(),
                visitorEmail: email,
                visitorPhone: phone,
                visitorPhone: phone,
                companyName,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            };
        });

        const successObj = successResponse('Most liked details', visitors);
        res.status(successObj.status).send(successObj);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching Most liked details', error });
    }
};


