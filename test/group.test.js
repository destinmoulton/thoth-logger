/**
 * Test .group(), .groupEnd(), .groupCollapsed()
 */

const chai = require("chai");
const consoleMock = require("console-mock");
const fetchMock = require("fetch-mock");

const expect = chai.expect;

const chronicleLogger = require("../index");
const DATA = require("./lib/groupData");
const METHODS = DATA.METHODS;
const TESTS = DATA.TESTS;

const APP = "TEST GROUP APP";
const SERVER = "https://servername.com";
const EXPECTED_HEADERS = { "Content-Type": "text/plain" };
const EXPECTED_METHOD = "post";

const CONSOLE_OPTIONS = [
    { name: "DOES log to the console.", consoleEnabled: true },
    {
        name: "Does NOT log to the console.",
        consoleEnabled: false
    }
];

describe("ChronicleLogger .group(), .groupEnd(), .groupCollapsed()", () => {
    CONSOLE_OPTIONS.forEach(consoleOption => {
        TESTS.forEach(test => {
            describe("Logs trace to server", () => {
                beforeEach(() => {
                    fetchMock.restore();
                    fetchMock.post(SERVER, "*");
                    consoleMock.enabled(false);
                    consoleMock.historyClear();
                    const config = {
                        server: SERVER,
                        app: APP,
                        clientInfo: {},
                        toConsole: consoleOption.consoleEnabled,
                        globalConsole: consoleMock.create()
                    };

                    chronicleLogger.init(config);
                });

                it(consoleOption.name + " - " + test.title, () => {
                    let numMethodsCalled = 0;
                    test.sequence.forEach(method => {
                        if (method === "group") {
                            chronicleLogger.group();
                        } else if (method === "groupCollapsed") {
                            chronicleLogger.groupCollapsed();
                        } else if (method === "groupEnd") {
                            chronicleLogger.groupEnd();
                        } else {
                            chronicleLogger[method].apply(
                                this,
                                METHODS[method]
                            );
                        }

                        numMethodsCalled++;
                    });

                    const history = consoleMock.history();
                    if (consoleOption.consoleEnabled) {
                        expect(history)
                            .to.be.an("array")
                            .and.have.length(numMethodsCalled);
                    } else {
                        expect(history)
                            .to.be.an("array")
                            .and.have.length(0);
                    }

                    const fetchedCalls = fetchMock.calls();

                    expect(fetchedCalls, "Mocked fetch failed.")
                        .to.be.an("array")
                        .that.is.length(1);

                    fetchedCalls.forEach((call, index) => {
                        const details = call[1];
                        const body = JSON.parse(details.body);
                        expect(call[0]).to.equal(SERVER);
                        expect(details.method).to.equal(EXPECTED_METHOD);
                        expect(details.headers).to.deep.equal(EXPECTED_HEADERS);
                        expect(body.app).to.equal(APP);
                        expect(body.type).to.equal("group");
                        expect(body.info).to.deep.equal(test.expectedData);
                    });
                });
            });
        });
    });
});
