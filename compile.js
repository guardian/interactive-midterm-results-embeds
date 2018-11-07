var fs = require('fs-extra');
var request = require('sync-request');
var handlebars = require('handlebars');

var codeToNameDict = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}

function ordinal_suffix_of(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

function buildEmbeds(chamber) {
    var data = request('GET', 'https://interactive.guim.co.uk/2018/11/midterms-results/prod/' + chamber + '_details.json');
        data = JSON.parse(data.getBody('utf8'));

    var template 

    for (var i in data) {
        var html = fs.readFileSync('./index.html', 'utf8');
        var template = handlebars.compile(html);
        var race = data[i];

        race.title = i;
        race.chamber = chamber.charAt(0).toUpperCase() + chamber.substr(1).toLowerCase();

        handlebars.registerHelper('formatTitle', function(title, chamber) {
            var state = codeToNameDict[title.substring(0, 2)];

            if (chamber === 'House') {
                var number = parseInt(title.substring(2, 4));
                    number = ordinal_suffix_of(number);

                return state + ' ' + number + ' ' + chamber;
            } else {
                return state + ' ' + chamber;
            }
        });

        handlebars.registerHelper('formatNumbers', function(number) {
            return number.toLocaleString();
        });

        handlebars.registerHelper('votesAsAPercentage', function(votes) {
            var totalVotes = 0;

            if (race && race.details) {
                for (var i in race.details.candidates) {
                    totalVotes += race.details.candidates[i].votes;
                }

                return (votes * 100 / totalVotes).toFixed(1);
            }
        }.bind(race));

        fs.mkdirsSync('./.build/v1/' + chamber);
        fs.writeFileSync('./.build/v1/' + chamber + '/' + i + '.html', template(race));
    }
}

buildEmbeds('senate');
buildEmbeds('house');
buildEmbeds('governors');