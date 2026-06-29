#!/usr/bin/env python3
import os

BASE = r'd:\TEHRAJA\teh-raja'
admin_path = os.path.join(BASE, 'app', 'admin', 'page.tsx')

with open(admin_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: OrderActions has an extra </div>
BAD_ORDER_ACTIONS = """            )}
        </div>

        </div>
    );
}"""
GOOD_ORDER_ACTIONS = """            )}
        </div>
    );
}"""

if BAD_ORDER_ACTIONS in content:
    content = content.replace(BAD_ORDER_ACTIONS, GOOD_ORDER_ACTIONS, 1)
    print("Fixed OrderActions closing")

# Fix 2: Loyalty Tab missing closing </div> for the animate-fade-in wrapper
# It currently looks like this:
BAD_LOYALTY_CLOSE = """                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>"""

GOOD_LOYALTY_CLOSE = """                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}
            </div>"""

if BAD_LOYALTY_CLOSE in content:
    content = content.replace(BAD_LOYALTY_CLOSE, GOOD_LOYALTY_CLOSE, 1)
    print("Fixed Loyalty Tab closing")
else:
    # Try line by line approach for loyalty
    print("Trying alternate loyalty fix")
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.strip() == ")}":
            # Check if previous lines match the loyalty table end
            if "</div>" in lines[i-1] and "</div>" in lines[i-2] and "</table>" in lines[i-3]:
                lines.insert(i, "                </div>")
                content = '\n'.join(lines)
                print("Fixed Loyalty Tab closing (alternate)")
                break

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(content)
