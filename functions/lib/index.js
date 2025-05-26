"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsletter = exports.news = exports.weather = void 0;
const weatherCache_1 = require("./weatherCache");
const newsCache_1 = require("./newsCache");
const newsletter_1 = require("./newsletter");
exports.weather = {
    getData: weatherCache_1.getWeatherData
};
exports.news = {
    getData: newsCache_1.getNewsData
};
exports.newsletter = {
    generateAndDeliver: newsletter_1.generateAndDeliverNewsletter
};
//# sourceMappingURL=index.js.map