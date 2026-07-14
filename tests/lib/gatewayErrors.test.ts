import { describe, expect, it } from "vitest";
import { getGatewayErrorMessage } from "@/lib/gateway/errors";

describe("getGatewayErrorMessage", () => {
  it("hides backend email validator details", () => {
    expect(
      getGatewayErrorMessage(
        "Gateway request failed with 400: Invalid request: Key: 'SendVerifyCodeRequest.Email' Error:Field validation for 'Email' failed on the 'email' tag",
        "send-code",
      ),
    ).toBe("邮箱格式不正确，请检查是否有空格或输入错误");
  });

  it("maps unavailable verification-code endpoints to a user-facing message", () => {
    expect(
      getGatewayErrorMessage(
        "Gateway request failed with 404: 404 page not found",
        "send-code",
      ),
    ).toBe("验证码服务暂时不可用，请稍后再试");
  });

  it("maps network gateway failures to a retryable connection message", () => {
    expect(
      getGatewayErrorMessage(
        "Gateway request failed: error sending request for url (https://sub.thqllm.com/api/v1/auth/logout)",
        "logout",
      ),
    ).toBe("网络连接失败，请检查网络后重试");
  });

  it("keeps unknown details for diagnostics", () => {
    expect(getGatewayErrorMessage("upstream quota exceeded", "general")).toBe(
      "upstream quota exceeded",
    );
  });
});
