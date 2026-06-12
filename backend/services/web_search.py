_search = None

def _get_search():
    global _search
    if _search is None:
        from langchain_community.tools import DuckDuckGoSearchRun
        _search = DuckDuckGoSearchRun()
    return _search

def search_web(query: str):
    return _get_search().run(query)
