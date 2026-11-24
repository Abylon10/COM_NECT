"""Converts the generated DOCX files to PDF with LibreOffice, building the table of contents and the lists
of tables and figures first (a plain `soffice --convert-to pdf` leaves them as "Update Field" text).

Usage: python3 to_pdf.py software.docx paper.docx

It also marks each DOCX so that Word refreshes those lists when the file is opened.
"""
import os
import subprocess
import sys
import time
import zipfile

import uno
from com.sun.star.beans import PropertyValue


def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def mark_update_fields(path):
    """Adds <w:updateFields w:val="true"/> to word/settings.xml so Word rebuilds the lists on open."""
    tmp = path + '.tmp'
    with zipfile.ZipFile(path) as src, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
        for item in src.infolist():
            data = src.read(item.filename)
            if item.filename == 'word/settings.xml' and b'w:updateFields' not in data:
                data = data.replace(b'</w:settings>', b'<w:updateFields w:val="true"/></w:settings>')
            dst.writestr(item, data)
    os.replace(tmp, path)


def main(paths):
    office = subprocess.Popen(['soffice', '--headless', '--invisible', '--norestore',
                               '--accept=socket,host=127.0.0.1,port=2083;urp;'])
    try:
        resolver = uno.getComponentContext().ServiceManager.createInstanceWithContext(
            'com.sun.star.bridge.UnoUrlResolver', uno.getComponentContext())
        for _ in range(60):
            try:
                ctx = resolver.resolve('uno:socket,host=127.0.0.1,port=2083;urp;StarOffice.ComponentContext')
                break
            except Exception:
                time.sleep(1)
        desktop = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
        for path in paths:
            url = uno.systemPathToFileUrl(os.path.abspath(path))
            doc = desktop.loadComponentFromURL(url, '_blank', 0, (prop('Hidden', True),))
            indexes = doc.getDocumentIndexes()
            count = indexes.getCount()
            for i in range(indexes.getCount()):
                indexes.getByIndex(i).update()
            doc.refresh()
            # A second pass picks up page numbers that moved when the lists grew.
            for i in range(indexes.getCount()):
                indexes.getByIndex(i).update()
            pdf = uno.systemPathToFileUrl(os.path.abspath(os.path.splitext(path)[0] + '.pdf'))
            doc.storeToURL(pdf, (prop('FilterName', 'writer_pdf_Export'),))
            doc.close(True)
            mark_update_fields(path)
            print(path, '->', os.path.splitext(path)[0] + '.pdf', f'({count} lists built)')
    finally:
        office.terminate()


if __name__ == '__main__':
    main(sys.argv[1:])
