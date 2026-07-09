import re

from app.schemas.inspection import QrParseResult


def parse_qr_code(raw_qr: str) -> QrParseResult:
    if not raw_qr or not raw_qr.strip():
        raise ValueError("QR code is empty")

    tokens = raw_qr.strip().split(";")
    if len(tokens) != 3:
        raise ValueError(
            f"Invalid QR format: expected 3 semicolon-delimited tokens, got {len(tokens)}"
        )

    token1, token2, token3 = tokens

    if not token1:
        raise ValueError("First token (part number) is empty")
    if not token2:
        raise ValueError("Second token (serial number) is empty")
    if not token3:
        raise ValueError("Third token (vendor code) is empty")

    part_str = re.sub(r"^[A-Za-z]+", "", token1)
    if not part_str or not part_str.isdigit():
        raise ValueError(
            f"First token '{token1}' must contain a numeric part number after removing alphabetic prefix"
        )
    part_number = int(part_str)

    serial_str = re.sub(r"^[A-Za-z]+", "", token2)
    if not serial_str or not serial_str.isdigit():
        raise ValueError(
            f"Second token '{token2}' must contain a numeric serial number after removing alphabetic prefix"
        )
    serial_number = int(serial_str)

    vendor_code = token3.strip()

    return QrParseResult(
        raw_qr=raw_qr.strip(),
        part_number=part_number,
        serial_number=serial_number,
        vendor_code=vendor_code,
    )
