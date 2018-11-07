function deploy() {
    console.log('hey');
    var thingsToUpload = [
        {
            files: '**/*',
            headers: {
                CacheControl: 'max-age=20'
            }
        },
        {
            files: '*',
            headers: {
                CacheControl: 'max-age=20'
            }
        }
    ];

    var path = require( 'path' );
    var fs = require( 'fs' );
    var mime = require( 'mime' );
    var AWS = require( 'aws-sdk' );
    var glob = require( 'glob' );
    var filesize = require( 'filesize' );
    var stevedore = require( 'stevedore' );
    var chalk = require( 'chalk' );

    var BUCKET = 'gdn-cdn';

    var BASE_DIR = path.resolve( '.build' );
    var MAX_CONCURRENT_UPLOADS = 8;

    try {
        var CREDENTIALS = new AWS.SharedIniFileCredentials({profile: 'default'});
        AWS.config.credentials = CREDENTIALS;

    } catch ( err ) {
        var message = 'Could not find AWS credentials. Make sure they have been added to ~/.aws/credentials';

        console.log( message );
        process.exit( 1 );
    }

    var s3 = new AWS.S3();

    var uploadQueue = [];

    console.log(thingsToUpload);

    thingsToUpload.forEach( function ( thing ) {
        var files = glob.sync( thing.files, {
            cwd: BASE_DIR,
            nodir: true,
            ignore: 'v/**/index.html'
        });

        files.forEach( function ( file ) {
            uploadQueue.push({
                file: file,
                headers: thing.headers
            });
        });
    });

    console.log('');

    var inFlight = 0;
    var loader;

    while ( inFlight < MAX_CONCURRENT_UPLOADS && uploadQueue.length ) {
        uploadNextItem();
    }

    function uploadNextItem () {
        var item = uploadQueue.shift();

        if ( !item ) {
            if ( !loader ) {
                loader = stevedore();
            }

            loader.message( inFlight + ' items remaining    ' );

            if ( !inFlight ) {
                loader.stop();
                console.log( '\n\nUpload complete!');
            }

            return;
        }

        inFlight += 1;

        var data = fs.readFileSync( path.join( BASE_DIR, item.file ) );

        var options = {
            Bucket: BUCKET,
            ACL: 'public-read',
            Key: 'embed/2018/11/midterm-results/' + item.file,
            Body: data,
            ContentType: mime.lookup( item.file )
        };

        Object.keys( item.headers ).forEach( function ( header ) {
            options[ header ] = item.headers[ header ];
        });

        console.log( '* %s : %s', pad( filesize( data.length ), 12 ), item.file );

        s3.putObject( options, function ( err ) {
            if ( err ) {
                console.log( 'err', err );
                throw err;
            }

            inFlight -= 1;
            uploadNextItem();
        });
    }

    function pad ( str, len ) {
        while ( str.length < len ) str += ' ';
        return str;
    }
}

deploy();
