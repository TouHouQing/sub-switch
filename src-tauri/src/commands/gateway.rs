use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use serde::Serialize;
use serde_json::Value;
use std::str::FromStr;

const GATEWAY_ORIGIN: &str = "https://sub.thqllm.com";
const ERROR_BODY_MAX_CHARS: usize = 512;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayHttpResponse {
    status: u16,
    body: Value,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn gateway_http_request(
    url: String,
    method: String,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
) -> Result<GatewayHttpResponse, String> {
    validate_gateway_url(&url)?;

    let method = Method::from_bytes(method.as_bytes())
        .map_err(|_| format!("Invalid gateway HTTP method: {method}"))?;
    if !matches!(
        method,
        Method::GET | Method::POST | Method::PUT | Method::PATCH | Method::DELETE
    ) {
        return Err(format!("Unsupported gateway HTTP method: {method}"));
    }

    let client = crate::proxy::http_client::get();
    let mut builder = client
        .request(method, &url)
        .headers(sanitize_headers(headers)?);

    if let Some(body) = body {
        builder = builder.body(body);
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("Gateway request failed: {error}"))?;
    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Gateway response read failed: {error}"))?;

    Ok(GatewayHttpResponse {
        status,
        body: parse_gateway_body(&text),
    })
}

fn validate_gateway_url(raw: &str) -> Result<(), String> {
    let url = url::Url::parse(raw).map_err(|error| format!("Invalid gateway URL: {error}"))?;
    let origin = format!(
        "{}://{}",
        url.scheme(),
        url.host_str().unwrap_or_default()
    );
    if origin != GATEWAY_ORIGIN {
        return Err("Gateway request host is not allowed".to_string());
    }
    Ok(())
}

fn sanitize_headers(
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<HeaderMap, String> {
    let mut result = HeaderMap::new();
    for (name, value) in headers.unwrap_or_default() {
        if should_skip_header(&name) {
            continue;
        }
        let header_name = HeaderName::from_str(&name)
            .map_err(|_| format!("Invalid gateway request header: {name}"))?;
        let header_value = HeaderValue::from_str(&value)
            .map_err(|_| format!("Invalid value for gateway request header: {name}"))?;
        result.insert(header_name, header_value);
    }
    Ok(result)
}

fn should_skip_header(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "host" | "origin" | "referer" | "content-length" | "connection"
    )
}

fn parse_gateway_body(text: &str) -> Value {
    if text.is_empty() {
        return Value::Null;
    }
    serde_json::from_str(text)
        .unwrap_or_else(|_| Value::String(truncate_body(text).to_string()))
}

fn truncate_body(body: &str) -> String {
    if body.chars().count() <= ERROR_BODY_MAX_CHARS {
        body.to_string()
    } else {
        let mut output: String = body.chars().take(ERROR_BODY_MAX_CHARS).collect();
        output.push('…');
        output
    }
}
