const fs = require("fs");

const chai = require("chai");
const mockConsole = require("console-mock");
const mockFetch = require("fetch-mock");
const MockBrowser = require("mock-browser").mocks.MockBrowser;
const nodeFetch = require("node-fetch");

const expect = chai.expect;

// The Chronicle Console we are going to test.
const chronicleConsole = require("../dist/chronicleconsole");

const generateExpectedClient = require("./lib/generateExpectedClient");
const { generateParamData } = require("./lib/generateExpectedFetchData");

const METHODS = require("./data/methods");

// Some constants (for configuration)
const SERVER = "http://testserver.com";
const APP = "TestApp";
const EXPECTED_HEADERS = { "Content-Type": "text/plain" };
const EXPECTED_METHOD = "post";

const MODES = [
    { title: "console OFF, log OFF", consoleEnabled: false, logEnabled: false },
    { title: "console OFF, log ON", consoleEnabled: false, logEnabled: true },
    { title: "console ON, log OFF", consoleEnabled: true, logEnabled: false },
    { title: "console ON, log ON", consoleEnabled: true, logEnabled: true }
];

describe("Chronicle Console Methods", () => {
    MODES.forEach(mode => {
        describe(mode.title, () => {
            METHODS.forEach(method => {
                describe(`console.${method.name}()`, () => {
                    let expectedClient = {};
                    beforeEach(() => {
                        // Monitor all POSTs
                        mockFetch.restore();
                        mockFetch.post(SERVER, 200);
                        mockConsole.enabled(false);
                        mockConsole.historyClear();

                        // Build a mock for the window.navigator
                        mockWindow = new MockBrowser().getWindow();
                        global.navigator = mockWindow.navigator;

                        // Add the window navigator to the expected info
                        expectedClient = generateExpectedClient(
                            mockWindow.navigator
                        );

                        const methodsToLog = mode.logEnabled
                            ? [method.name]
                            : [];

                        const config = {
                            server: SERVER,
                            app: APP,
                            toConsole: mode.consoleEnabled,
                            consoleObject: mockConsole.create(),
                            globalize: false,
                            methodsToLog
                        };
                        chronicleConsole.init(config);
                    });

                    it("Runs data tests.", () => {
                        // Run the console method tests
                        let possibleConsoleCount = 0;
                        let possibleLogCount = 0;
                        method.suite.forEach(test => {
                            chronicleConsole[method.name].apply(
                                chronicleConsole,
                                test.params
                            );
                            possibleConsoleCount++;

                            if (test.expectations.shouldLogToServer) {
                                possibleLogCount++;
                            }
                        });

                        // Check the console history
                        const history = mockConsole.history();
                        if (mode.consoleEnabled && method.canConsole) {
                            expect(history)
                                .to.be.an("array")
                                .and.have.length(possibleConsoleCount);
                        } else {
                            expect(history)
                                .to.be.an("array")
                                .and.have.length(0);
                        }

                        const fetchedCalls = mockFetch.calls();
                        if (!mode.logEnabled) {
                            expect(fetchedCalls)
                                .to.be.an("array")
                                .of.length(0);
                        } else {
                            expect(fetchedCalls)
                                .to.be.an("array")
                                .of.length(possibleLogCount);

                            let skipCount = 0;
                            fetchedCalls.forEach((call, idx) => {
                                const exp = method.suite[idx + skipCount];
                                if (!exp.expectations.shouldLogToServer) {
                                    // This one isn't logged to server
                                    skipCount++;
                                } else {
                                    const res = call[1];
                                    const {
                                        app,
                                        client,
                                        type,
                                        data,
                                        trace
                                    } = JSON.parse(res.body);
                                    expect(res.method).to.equal(
                                        EXPECTED_METHOD
                                    );
                                    expect(res.headers).to.deep.equal(
                                        EXPECTED_HEADERS
                                    );
                                    expect(app).to.equal(APP);
                                    expect(client).to.deep.equal(
                                        expectedClient
                                    );
                                    expect(type).to.equal(method.name);
                                    expect(data).to.deep.equal(
                                        generateParamData(exp.params)
                                    );
                                    expect(trace).to.be.length.gt(4);
                                }
                            });
                        }
                    });
                });
            });
        });
    });
});
