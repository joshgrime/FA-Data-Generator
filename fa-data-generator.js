/* CONFIG */

const productLinesToCreate = 1000; //how many SKUs to create (item-color level)
const storesToCreate = 50; //always have 2 warehouses and web, how many stores
const stockLimit = 100; //upper-bound for randomised stock count for each product line (1 to stockLimit)
const warehouse_weight = 0.5; //probability of stock being in warehouse vs a store (0 to 1)
const stock_in_date_range = 14; //how many days back to randomly pick stockin + pricing dates
const sales_date_range = 14; //how many days back to randomly pick sales dates
const sales_upper_limit = 5; //upper-bound for randomised unit sales (0 to sales_upper_limit)
const price_upper_limit = 100; //pricing upper limit
const price_lower_limit = 5; //pricing lower limit
const cost_divisor = 2; //divide price by x to get cost
const boh_max_upper = 100; //capacity limits
const boh_min_upper = 10; //all are between 0 and chosen number
const foh_max_upper = 20; //boh = back of house
const foh_min_upper = 10; //foh = front of house


/* Libs */

const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('1234567890abcdef', 10);
const dayjs = require('dayjs');
const csv = require('fast-csv');
const fs = require('fs');

/* Starter Data */

var colors = ['White', 'Black', 'Navy', 'Blue', 'Red', 'Orange', 'Green', 'Red', 'Yellow', 'Purple', 'Pink'];
var sizes = {
    apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    juniorShoes: ['10', '11', '12', '13', '1', '2', '3'],
    adultShoes: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
};
var seasonCodes = ['SUM', 'SPR', 'AUT', 'WIN'];
var items = {
    categories: ['Men\'s', 'Women\'s', 'Junior'],
    types: [
        {
            name: 'Footwear',
            types: ['Trainers', 'Shoes', 'Boots']
        },
        {
            name: 'Apparel',
            types: ['Jacket', 'Shirt', 'T-Shirt', 'Denim Jean', 'Shorts', 'Swim Shorts', 'Tracksuit', 'Hoodie', 'Jog Pant', 'Woven Pant', 'Loungewear']
        }
    ],
    brands: [
        {
            name: 'Nike',
            franchises: ['AF1', 'Air Max', 'Vapormax', 'React', 'Club Fleece', 'Jordan']
        },
        {
            name: 'Adidas',
            franchises: ['Continental', 'Swift', 'Forum', 'Ozweego', 'Stan Smith', 'Superstar', 'Gazelle']
        },
        {
            name: 'Kings Will Dream',
            franchises: []
        },
        {
            name: 'Tommy Hilfiger',
            franchises: []
        },
        {
            name: 'Hoodrich',
            franchises: []
        },
        {
            name: 'North Face',
            franchises: []
        },
        {
            name: 'Montirex',
            franchises: []
        },
        {
            name: 'Zavetti',
            franchises: []
        },
        {
            name: 'Converse',
            franchises: []
        },
        {
            name: 'Nicce',
            franchises: []
        }
    ]
};

/* workflow */

async function init(){
    
    var locations = ['WH001', 'WEB001'];
    for (let i=0; i<storesToCreate; i++) {
        locations.push('ST0'+i);
    }

    var product_lines = [];

    console.log('Generating '+product_lines+' product lines...');

    for (let j=0; j<productLinesToCreate; j++) {
        var new_lines = buildProductLine();
        console.log('Generated '+new_lines.length+' products!');
        //console.log(new_lines)
        product_lines = product_lines.concat(new_lines);
    }

    console.log(product_lines.length +' products created!');

    console.log('Distributing products across store network...');
    var product_distributions = await distributeProducts(product_lines, locations);
    console.log('Building price list...');
    var pricing = await buildPrices(product_lines);
    console.log('Building capacity list...');
    var location_capacities = await buildCapacity(locations);
    console.log('Generating sales...');
    var sales = await buildSales(product_lines, locations, pricing);
    console.log('Generating CSVs...');
    generateCSVs(product_lines, product_distributions[0], product_distributions[1], pricing, location_capacities, sales);

    /*
    var rando = randomNumber(0, product_lines.length-1);
    console.log('Finished generating data! There were '+product_lines.length+' product lines created. Here is a random sample from entry '+rando+':');
    console.log(JSON.stringify(product_lines[rando], null, 4));
    rando = randomNumber(0, product_distributions[0].length-1);
    console.log('Here\'s a random stockin from entry '+rando);
    console.log(JSON.stringify(product_distributions[0][rando], null, 4));
    rando = randomNumber(0, product_distributions[1].length-1);
    console.log('Here\'s a random stockcount from entry '+rando);
    console.log(JSON.stringify(product_distributions[1][rando], null, 4));
    rando = randomNumber(0, pricing.length-1);
    console.log('Here\'s a random pricing from entry '+rando);
    console.log(JSON.stringify(pricing[rando], null, 4));
    rando = randomNumber(0, location_capacities.length-1);
    console.log('Here\'s a random capacity from entry '+rando);
    console.log(JSON.stringify(location_capacities[rando], null, 4));
    rando = randomNumber(0, sales.length-1);
    console.log('Here\'s a random sale from entry '+rando);
    console.log(JSON.stringify(sales[rando], null, 4));
    */

}

//++sales
function buildSales(product_lines, locations, pricing) {
    return new Promise(function(resolve, reject) {

        var sales = [];

        var date_now = dayjs();
        var date_old = date_now.subtract(randomNumber(1, sales_date_range), 'days').format('DD/MM/YYYY');

        var locs = [...locations];
        locs.shift(); //remove warehouse

        for (let product of product_lines) {

            var price = pricing.filter(prices=>{
                return prices.productId === product.productId;
            });

            var unit_sales = randomNumber(0, sales_upper_limit);

            if (price.length > 0) {
                var obj = {
                    customerorderid: nanoid(),
                    saledate: date_old,
                    salelocation: locs[randomNumber(0, locs.length-1)],
                    transtype: 'sale',
                    productid: product.productId,
                    size: product.size,
                    color: product.color,
                    saleunits: unit_sales,
                    saleuprice: price[0].uprice,
                    salegrossrev: unit_sales * price[0].uprice
                }
                sales.push(obj);
            }
        }

        resolve(sales);

    });
}

//++capacity
function buildCapacity(locations) {
    return new Promise(function(resolve, reject) {

        var capacities = [];

        for (let loc of locations) {

            for (let i=0; i<items.types.length; i++) {

                let category = items.types[i].name;

                for (let j=0; j<items.brands.length; j++) {

                    let brand = items.brands[j].name;

                    let fohminunits = randomNumber(0, foh_min_upper);
                    let fohmaxunits = fohminunits + randomNumber(0, foh_max_upper);

                    let bohminunits = randomNumber(0, boh_min_upper);
                    let bohmaxunits = bohminunits + randomNumber(0, boh_max_upper);

                    var obj = {
                        locationid: loc,
                        productcategory: category,
                        brand: brand,
                        fohmaxunits: fohmaxunits,
                        fohminunits: fohminunits,
                        bohmaxunits: bohmaxunits,
                        bohminunits: bohminunits,
                        totalminunits: bohminunits + fohminunits,
                        totalmaxunits: bohmaxunits + fohmaxunits
                    }
                    capacities.push(obj);
                }
            }
        }

        resolve(capacities);

    });
}

//++pricing
function buildPrices(product_lines) {
    return new Promise(function(resolve, reject){

        var date_now = dayjs();
        var date_old = date_now.subtract(randomNumber(1, stock_in_date_range), 'days').format('DD/MM/YYYY');

        var pricing = [];

        for (let product of product_lines) {

            var style_price = randomDecimalNumber(price_lower_limit, price_upper_limit);
                var pricing_line = {
                    productId: product.productId,
                    size: product.size,
                    color: product.color,
                    pricingdate: date_old,
                    uprice: style_price,
                    ucost: style_price/cost_divisor
                };

                pricing.push(pricing_line);
        }

        resolve(pricing);

    });
}

//++locations
function distributeProducts(product_lines, locations){
    return new Promise(function(big_res, big_reject){
        var stockIn = [];
        var stockCount = [];

        var queueCount = 0;

        function queue(){

            if (queueCount >= product_lines.length) {
                //finish
                console.log('All done');
                big_res([stockIn, stockCount]);
            }
            else {
                console.log('Distributing item line '+(queueCount+1));
                var newStockIns = insertProduct(product_lines[queueCount]);
                queueCount++;
                newStockIns.then(x=>{
                    stockIn = stockIn.concat(x[0]);
                    stockCount = stockCount.concat(x[1]);
                    queue();
                });   
            }
        }
        queue();

        function insertProduct(product) {
            return new Promise(function(resolve, reject){

                var date_now = dayjs();

                var newStockIns = [];
                
                var newStockCounts = [];

                for (let size=0; size<product.totalStock; size++) { 

                    for (let i=0; i<size; i++) {

                        var stocktomove = randomNumber(1, (size-i));
                        
                        if (stocktomove > 1) i += stocktomove - 1;

                        var date_old = date_now.subtract(randomNumber(1, stock_in_date_range), 'days').format('DD/MM/YYYY');
        
                        var stock_in_line = {
                            productId: product.productId,
                            size: product.size,
                            color: product.color,
                            stocklocation: '',
                            units: stocktomove,
                            deliverydate: date_old
                        };

                        var stock_count_line = {
                            productId: product.productId,
                            size: product.size,
                            color: product.color,
                            stocklocation: '',
                            stockcount: stocktomove,
                            stockdate: date_old
                        }
        
                        var num = Math.random(); // 0 - 1 
        
                        if (warehouse_weight > num) {
                            //store
                            stock_in_line.stocklocation = locations[randomNumber(1,locations.length-1)];
                            stock_count_line.stocklocation = stock_in_line.stocklocation;
                        }
                        else {
                            stock_in_line.stocklocation = locations[0];
                            stock_count_line.stocklocation = stock_in_line.stocklocation;
                        }

                        newStockIns.push(stock_in_line);
                        newStockCounts.push(stock_count_line);
                    }
                }

                resolve([newStockIns, newStockCounts]);
                
            });
        }
    });
}


//++products
function buildProductLine(){

    var division = items.categories[randomNumber(0, items.categories.length-1)];
    //men, women, junior

    var typeIndex = items.types[randomNumber(0, items.types.length-1)];
    var itemType = typeIndex.name;
    //apparel, footwear
    var itemSubType = typeIndex.types[randomNumber(0, typeIndex.types.length-1)];
    //shoes, trainers or jackets, shirts

    var color = colors[randomNumber(0, colors.length-1)];
    //blue, red, green

    var seasonCode = seasonCodes[randomNumber(0, seasonCodes.length-1)];
    //SUM, WIN, AUT, SPR

    var brandIndex = items.brands[randomNumber(0, items.brands.length-1)];
    var itemDescription = brandIndex.name + ' ' + itemSubType + ' ' + color;
    if (brandIndex.franchises.length > 0) {
        itemDescription += ' ' + brandIndex.franchises[randomNumber(0, brandIndex.franchises.length-1)] + ' ' + itemSubType + ' ' + color;
    }
    //Nike AF1s, Adidas Gazelle

    var totalStock = randomNumber(1, stockLimit+1);

    var sizeIndex;

    if (itemType === 'Apparel') {
        sizeIndex = sizes.apparel;
    }
    else if (division === 'Junior') {
        sizeIndex = sizes.juniorShoes;
    }
    else {
        sizeIndex = sizes.adultShoes;
    }

    var randomSizes = {};

    for (let j=0; j<totalStock; j++) {
        let selectedSize = sizeIndex[randomNumber(0, sizeIndex.length-1)];
        if (typeof randomSizes[selectedSize] !== 'number') randomSizes[selectedSize] = 1;
        else randomSizes[selectedSize]++;
    }

    var product_payload = [];

    for (let x in randomSizes) {

        var productline = {
            phier1: division,
            phier2: division + ' ' +itemType,
            productId: nanoid(),
            size: x,
            totalStock: randomSizes[x],
            description: itemDescription,
            seasoncode: seasonCode,
            brand: brandIndex.name,
            color: color
        }
        product_payload.push(productline)
    }


    return product_payload;
}

function generateCSVs(product_data, stockin_data, stockcount_data, pricing_data, capacity_data, sales_data) {

    if (!fs.existsSync(__dirname+"/output/")){
        fs.mkdirSync(__dirname+"/output/");
    }

    var timestamp = dayjs().valueOf();

    fs.mkdirSync(__dirname+"/output/"+timestamp+'/');

    

    var product_table = product_data.map(product=>{
        return [product.productId, product.phier1, product.phier2, product.size, product.color, product.brand, product.seasoncode]
    })
    var product_final = [
        ['productId', 'phier1', 'phier2', 'size', 'color', 'brand', 'seasoncode']
    ];
    product_final = product_final.concat(product_table);
    csv.writeToPath(__dirname+"/output/"+timestamp+"/products.csv", product_final, {headers: true})
                .on("finish", function(){
                      console.log('Product file created.');
                });

    var stockin_table = stockin_data.map(stockin=>{
        return [stockin.deliverydate, stockin.stocklocation, stockin.productId, stockin.size, stockin.color, stockin.units]
    })
    var stockin_final = [
        ['deliverydate', 'stocklocation', 'productid', 'size', 'color', 'units']
    ];
    stockin_final = stockin_final.concat(stockin_table);
    csv.writeToPath(__dirname+"/output/"+timestamp+"/stockin.csv", stockin_final, {headers: true})
                .on("finish", function(){
                        console.log('Stockin file created.');
                });
    
    var stockcount_table = stockcount_data.map(stockcount=>{
        return [stockcount.stockdate, stockcount.stocklocation, stockcount.productId, stockcount.size, stockcount.color, stockcount.stockcount]
    })
    var stockcount_final = [
        ['stockdate', 'stocklocation', 'productid', 'size', 'color', 'units']
    ];
    stockcount_final = stockcount_final.concat(stockcount_table);
    csv.writeToPath(__dirname+"/output/"+timestamp+"/stockcount.csv", stockcount_final, {headers: true})
                .on("finish", function(){
                        console.log('Stock count file created.');
                });

    var pricing_table = pricing_data.map(pricing=>{
        return [pricing.productId, pricing.size, pricing.color, pricing.pricingdate, pricing.uprice, pricing.ucost]
    })
    var pricing_final = [
        ['productid', 'size', 'color', 'pricingdate', 'uprice', 'ucost']
    ];
    pricing_final = pricing_final.concat(pricing_table);
    csv.writeToPath(__dirname+"/output/"+timestamp+"/pricing.csv", pricing_final, {headers: true})
                .on("finish", function(){
                        console.log('Pricing file created.');
                });
    
    var capacity_table = capacity_data.map(capacity=>{
        return [capacity.locationid, capacity.productcategory, capacity.brand, capacity.fohmaxunits, capacity.fohminunits, capacity.bohmaxunits, capacity.bohminunits, capacity.totalminunits, capacity.totalmaxunits]
    })
    var capacity_final = [
        ['locationid', 'productcategory', 'brand', 'fohmaxunits', 'fohminunits', 'bohmaxunits', 'bohminunits', 'totalminunits', 'totalmaxunits']
    ];
    capacity_final = capacity_final.concat(capacity_table);
    csv.writeToPath(__dirname+"/output/"+timestamp+"/capacity.csv", capacity_final, {headers: true})
                .on("finish", function(){
                        console.log('Capacity file created.');
                });

    var sales_table = sales_data.map(sales=>{
        return [sales.customerorderid, sales.saledate, sales.salelocation, sales.transtype, sales.productid, sales.size, sales.color, sales.saleunits, sales.saleuprice, sales.salegrossrev];
    })
    var sales_final = [
        ['customerorderid', 'saledate', 'salelocation', 'transtype', 'productid', 'size', 'color', 'saleunits', 'saleuprice', 'salegrossrev']
    ];
    sales_final = sales_final.concat(sales_table);
    csv.writeToPath(__dirname+"/output/"+timestamp+"/sales.csv", sales_final, {headers: true})
                .on("finish", function(){
                        console.log('Sales file created.');
                });
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomDecimalNumber(min, max) {  
    var rand = Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);
    var power = Math.pow(10, 2);
    return Math.floor(rand*power) / power;
}

init();