import { getErrorMessage } from "./error.utils";

describe("getErrorMessage", () => {
  it("returns fallback for null", () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
  });

  it("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("Unknown error");
  });

  it("accepts a custom fallback", () => {
    expect(getErrorMessage(null, "oops")).toBe("oops");
  });

  it("returns network message for status 0", () => {
    expect(getErrorMessage({ status: 0 })).toBe(
      "Cannot reach the server — check your connection or try again."
    );
  });

  it("does not treat non-zero status as network error", () => {
    const err = { status: 422, error: { detail: "bad input" } };
    expect(getErrorMessage(err)).toBe("bad input");
  });

  it("returns string detail from error body", () => {
    const err = { error: { detail: "Not found" } };
    expect(getErrorMessage(err)).toBe("Not found");
  });

  it("ignores empty string detail and falls through", () => {
    const err = { error: { detail: "", message: "fallback msg" } };
    expect(getErrorMessage(err)).toBe("fallback msg");
  });

  it("joins Pydantic 422 array detail using msg fields", () => {
    const err = {
      error: {
        detail: [
          { msg: "field required", loc: ["body", "name"] },
          { msg: "Extra inputs are not permitted", loc: ["body", "foo"] },
        ],
      },
    };
    expect(getErrorMessage(err)).toBe(
      "field required; Extra inputs are not permitted"
    );
  });

  it("falls back to JSON.stringify for array items without msg", () => {
    const err = { error: { detail: [{ type: "missing" }] } };
    expect(getErrorMessage(err)).toBe('{"type":"missing"}');
  });

  it("ignores empty detail array and falls through", () => {
    const err = { error: { detail: [], message: "body message" } };
    expect(getErrorMessage(err)).toBe("body message");
  });

  it("returns body.message when detail is absent", () => {
    const err = { error: { message: "Service unavailable" } };
    expect(getErrorMessage(err)).toBe("Service unavailable");
  });

  it("returns top-level message when error body is absent", () => {
    const err = { message: "Http failure response: 503" };
    expect(getErrorMessage(err)).toBe("Http failure response: 503");
  });

  it("returns fallback when no message fields are present", () => {
    expect(getErrorMessage({ status: 500 })).toBe("Unknown error");
  });

  it("returns fallback when status is not a number", () => {
    const err = { status: "0", message: "some msg" };
    expect(getErrorMessage(err)).toBe("some msg");
  });
});
