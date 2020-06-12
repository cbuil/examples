#!/usr/bin/env node
import {ActorInitSparql} from "@comunica/actor-init-sparql";
import {IActorQueryOperationOutputBindings} from "@comunica/bus-query-operation";
import {Setup} from "@comunica/runner";
import {MyActionObserverRdfDereference} from "..";
// import {ActionObserverHttp} from "@comunica/actor-sparql-serialize-stats";
import {ActionObserverHttp} from "..";
import * as fs from 'fs';

(async function() {
  // Instantiate a Comunica runner, this will instantiate all components in the given config-default.json.
  // Typically, this happens behind the scenes when calling newEngineDynamic, which will return the SPARQL engine actor.
  // However, since we not only need access to the SPARQL engine, but also our custom observer,
  // we need access to the runner instance, so that we can retrieve the SPARQL engine and our observer from it.
  const runner = await Setup.instantiateComponent(__dirname + '/../config/config-default.json',
    'urn:comunica:my', // The IRI of the runner, as defined in config-default.json
    { mainModulePath: __dirname + '/../' }); // The path to the root module, so that the setup code can find our new observer component

    var fs = require('fs');
    var path = require('path');
    var args = process.argv.slice(2);
    console.log('args: ', args);
    // Buffer mydata
    // var BUFFER = bufferFile(args[0]);

    // fs.readFile(args[0], (err, data) => {
    //   if (err) throw err;
    //     console.log(data);
    // });

  // Retrieve the SPARQL engine and observer instances from our runner.
  const { engine, observer, requestsObserver }: { engine: ActorInitSparql, observer: MyActionObserverRdfDereference, requestsObserver: ActionObserverHttp } = runner.collectActors({
    engine: 'urn:comunica:sparqlinit', // The SPARQL engine instance. The value is the IRI of the SPARQL init actor: https://github.com/comunica/comunica/blob/master/packages/actor-init-sparql/config/sets/sparql-init.json
    observer: 'urn:observer:my', // Our observer instance. The value is the IRI that we gave it in config/sets/rdf-dereference-observer.json
    requestsObserver: 'urn:comunica:my',
  });

  // Execute a SPARQL query using our engine.
  console.time("time");
  let query: string = fs.readFileSync(args[0],'utf8');
  // console.log(query);
  const result = <IActorQueryOperationOutputBindings> await engine.query(
    // 'SELECT * WHERE { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 1000',
    query,
    { sources: ['http://fragments.dbpedia.org/2015/en'] },
    // { sources: args[1] },
  );
  // const { data } = await engine.resultToString(result, 'stats');

  // Handle the query results in a streaming manner
  let results: number = 0;
  let httpObserver: ActionObserverHttp;

  // query	#TPs	exec time 1st sol.	#req 1st sol	exec. time	#req	#triples received	result size	timeout?
  result.bindingsStream.on('data', (data) => results++);
  result.bindingsStream.on('end', () => {
    // Wait a bit, as there may still be buffered actions (TODO: fix this in Comunica so that actions are aborted once query exec ends)
    setTimeout(() => {
        let time = console.timeEnd("time")
        // stats to collect: query	#TPs	exec time 1st sol.	#req 1st sol	exec. time	#req	#triples received	result size	timeout?
      // Print stats to stdout
      console.log('Query results\tHTTP requests\tProcessed quads\tExecution time');
      console.log(results + '\t' + observer.urls.length + '\t' + observer.quads + '\t' + httpObserver.requests);
      // console.log('HTTP requests: ' + observer.urls.length);
      // console.log('Processed quads: ' + observer.quads);
      // console.timeEnd("time");
    }, 100);
  });
})();
