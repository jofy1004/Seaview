var dimID = 244;
data_raw = [];
ip_nums = [];
indices = {};

var margin = {top: 20, right: 50, bottom: 30, left: 50},
    width = 200 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

function makeArrayOf(value, length) {
    if(typeof(value) !== "object"){
	var arr = [], i = length;
	while (i--) {
	    arr[i] = value;
	}
	return arr;
    }
    //TODO: It should be a new instance of the object type not a specific type
    else{
	var arr = [], i = length;
	while (i--) {
	    arr[i] = {};
	}
	return arr;
    }
}

//Max and min for hashes
var extentHash = function(hash){
    var min = Math.pow(10,9);var max = -min;
    d3.keys(hash).map(function(key){
	max = hash[key]>max?hash[key]:max;
	min = hash[key]<min?hash[key]:min;
    });
    return([min,max]);
};

var extent = function(arr,field){
    var min = Math.pow(10,9);var max = -min;
    arr.map(function(d){
	max = d[field]>max?d[field]:max;
	min = d[field]<min?d[field]:min;
    });
    return ([min,max]);
}

ips.map(function(d,i){
    if(d["dimensionID"] == dimID){
	var ip = d["IPNum"]
	ip_nums.push(ip);
	indices[ip+""] = 0;
    }
});

logs.map(function(d,i){
    ip_nums.map(function(ip,i){
	if(ip == d["right"])
	    data_raw.push({
		"label":ip,
		"value":d["left"],
		"index":++indices[ip+""]
	    });
    });
});

data = makeArrayOf({},extentHash(indices)[1]+1);
data_raw.map(function(d){
    data[d["index"]-1]["index"] = d["index"];
    data[d["index"]-1][d["label"]+""] = d["value"];
});

console.log(data);

if(ip_nums.length>20)
    console.error("The number of dims is greater than the color limit");

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

x.domain(extentHash(indices));
y.domain(extent(data_raw,"value"));

var color = d3.scale.category20();

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d,i) { return x(i); })
    .y(function(d) { return y(d); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

color.domain(d3.keys(data[0]).filter(function(key) { return key !== "index"; }));
svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

//column view of data
var cols = [];
color.domain().map(function(ip){
    values = [];
    name = "";
    
    data.map(function(d) {
	if(typeof(d[ip])!== "undefined")
	    values.push(d[ip]);
	else
	    values.push(0);
	name = ip;
    });
    cols.push({
	"name": name,
	"values": values
    })
});

var ip = svg.selectAll(".strokes")
      .data(cols)
    .enter().append("g")
      .attr("class", "strokes");

ip.append("path")
    .attr("class", "strokes")
    .attr("d", function(d) { return line(d.values); })
    .attr("data-legend",function(d) { return d.name})
    .style("stroke", function(d) { return color(d.name); });

ip.append("text")
    .datum(function(d) { console.log(d); return {name: d.name, value: d.values[d.values.length - 1], x:extentHash(indices)[1]}; })
    .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.value) + ")"; })
    .attr("x", 3)
    .attr("dy", ".35em")
    .style("stroke",function(d){ return color(d.name); })
    .text(function(d) { return d.name; });

legend = svg.append("g")
    .attr("class","legend")
    .attr("transform","translate(840,30)")
    .style("font-size","12px")
    .call(d3.legend);
